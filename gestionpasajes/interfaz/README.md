# Interfaz de gestionpasajes

Aplicación web local para demostrar el modelo MongoDB del sistema de pasajes.

## Inicio

MongoDB debe estar disponible en `127.0.0.1:27017`. Luego:

```bash
python3 server.py
```

La dirección local es `http://127.0.0.1:4173`.

## Componentes

- `public/index.html`: estructura de las pantallas.
- `public/styles.css`: diseño visual y comportamiento adaptable.
- `public/app.js`: interacción del navegador y consumo de la API.
- `server.py`: servidor web y API local sin dependencias externas de Python.
- `mongo_api.js`: consultas, agregaciones y reserva atómica ejecutadas en MongoDB.

La API no recibe JavaScript arbitrario desde el navegador. Los parámetros llegan mediante variables de entorno al script MongoDB y son validados antes de construir cada consulta.
