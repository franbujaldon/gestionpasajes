#!/usr/bin/env python3
import json
import os
import subprocess
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public"
MONGO_SCRIPT = ROOT / "mongo_api.js"
MONGO_URI = "mongodb://127.0.0.1:27017"


def ejecutar_mongo(accion, parametros=None):
    entorno = os.environ.copy()
    entorno["API_ACTION"] = accion
    entorno["API_PARAMS"] = json.dumps(parametros or {}, ensure_ascii=False)
    resultado = subprocess.run(
        ["mongosh", "--quiet", MONGO_URI, str(MONGO_SCRIPT)],
        cwd=str(ROOT), env=entorno, capture_output=True, text=True, timeout=20, check=False
    )
    for linea in reversed(resultado.stdout.splitlines()):
        if linea.startswith("__JSON__"):
            return json.loads(linea.removeprefix("__JSON__"))
        if linea.startswith("__ERROR__"):
            mensaje = json.loads(linea.removeprefix("__ERROR__")).get("error", "Error de MongoDB")
            raise ValueError(mensaje)
    detalle = resultado.stderr.strip() or resultado.stdout.strip() or "MongoDB no devolvió una respuesta válida."
    raise RuntimeError(detalle)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def enviar_json(self, datos, estado=HTTPStatus.OK):
        cuerpo = json.dumps(datos, ensure_ascii=False).encode("utf-8")
        self.send_response(estado)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def parametros(self):
        consulta = parse_qs(urlparse(self.path).query)
        return {clave: valores[0] for clave, valores in consulta.items()}

    def do_GET(self):
        ruta = urlparse(self.path).path
        if not ruta.startswith("/api/"):
            return super().do_GET()
        try:
            if ruta == "/api/bootstrap":
                datos = ejecutar_mongo("bootstrap")
            elif ruta == "/api/viajes":
                datos = ejecutar_mongo("buscar_viajes", self.parametros())
            elif ruta.startswith("/api/viajes/") and ruta.endswith("/asientos"):
                partes = ruta.strip("/").split("/")
                datos = ejecutar_mongo("asientos", {**self.parametros(), "viajeId": partes[2]})
            elif ruta == "/api/pasajes":
                datos = ejecutar_mongo("pasajes_dni", self.parametros())
            elif ruta == "/api/pasajeros":
                datos = ejecutar_mongo("pasajeros")
            elif ruta == "/api/informes":
                datos = ejecutar_mongo("informes")
            elif ruta == "/api/indices":
                datos = ejecutar_mongo("indices")
            else:
                return self.enviar_json({"error": "Recurso no encontrado."}, HTTPStatus.NOT_FOUND)
            self.enviar_json(datos)
        except ValueError as error:
            self.enviar_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            self.enviar_json({"error": f"No se pudo consultar MongoDB: {error}"}, HTTPStatus.SERVICE_UNAVAILABLE)

    def do_POST(self):
        ruta = urlparse(self.path).path
        if ruta != "/api/reservas":
            return self.enviar_json({"error": "Recurso no encontrado."}, HTTPStatus.NOT_FOUND)
        try:
            longitud = int(self.headers.get("Content-Length", "0"))
            if longitud < 2 or longitud > 10_000:
                raise ValueError("El cuerpo de la solicitud es inválido.")
            datos = json.loads(self.rfile.read(longitud).decode("utf-8"))
            self.enviar_json(ejecutar_mongo("reservar", datos), HTTPStatus.CREATED)
        except (ValueError, json.JSONDecodeError) as error:
            self.enviar_json({"error": str(error)}, HTTPStatus.BAD_REQUEST)
        except (RuntimeError, subprocess.TimeoutExpired) as error:
            self.enviar_json({"error": f"No se pudo consultar MongoDB: {error}"}, HTTPStatus.SERVICE_UNAVAILABLE)

    def log_message(self, format, *args):
        print(f"[interfaz] {self.address_string()} - {format % args}")


if __name__ == "__main__":
    servidor = ThreadingHTTPServer(("127.0.0.1", 4173), Handler)
    print("Interfaz disponible en http://127.0.0.1:4173")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        servidor.server_close()
