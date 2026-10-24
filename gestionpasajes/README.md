# gestionpasajes

Implementación inicial en MongoDB del sistema de gestión de pasajes de larga distancia para una única empresa.

## Contenido

- `scripts/01_estructura.js`: crea las nueve colecciones, incluida una serie temporal, aplica validadores y crea los índices iniciales.
- `scripts/02_datos_prueba.js`: carga un conjunto coherente de datos ficticios mediante operaciones idempotentes.
- `scripts/03_verificacion.js`: comprueba cantidades, relaciones y reglas básicas del modelo.
- `scripts/04_datos_ampliados.js`: amplía el escenario para consultas, agregaciones y pruebas de rendimiento.
- `scripts/05_verificacion_ampliada.js`: controla la integridad del conjunto ampliado.
- `scripts/06_migrar_dni_pasajes.js`: completa la fotografía del pasajero en bases creadas antes de incorporar la búsqueda directa por documento.
- `scripts/07_migrar_optimizacion_interfaz.js`: completa pares origen-destino y el código de recorrido en bases creadas con una versión anterior.
- `scripts/08_operaciones_interfaz.js`: define las consultas y operaciones que utilizará la interfaz, incluida la reserva atómica por tramo.
- `scripts/09_verificacion_operaciones.js`: prueba la búsqueda, la disponibilidad y el rechazo de una doble reserva, y limpia sus datos de prueba.
- `scripts/10_series_temporales.js`: carga telemetría ficticia de tres viajes en `seguimientoviajes`.
- `scripts/11_consultas_presentacion.js`: ejecuta diez consultas avanzadas de solo lectura para la exposición.
- `scripts/12_verificacion_completa.js`: controla estructura, referencias, índices, plan de ejecución, GIS y serie temporal.
- `consultas/GUIA_MY_QUERIES.md`: indica qué consultas guardar manualmente en My Queries de Compass.
- `consultas/CATALOGO_MY_QUERIES.md`: contiene quince consultas completas, listas para copiar y guardar en Compass.
- `scripts/13_verificacion_myqueries.js`: prueba los resultados e índices esperados del catálogo de My Queries.

Los scripts no eliminan la base ni vacían colecciones. Se pueden volver a ejecutar: la estructura se actualiza con `collMod`, los índices se conservan y los datos de prueba se reemplazan por su `_id` fijo.

## Ejecución

Con un servidor MongoDB local iniciado en el puerto predeterminado:

```bash
mongosh scripts/01_estructura.js
mongosh scripts/02_datos_prueba.js
mongosh scripts/03_verificacion.js
mongosh scripts/04_datos_ampliados.js
mongosh scripts/05_verificacion_ampliada.js
mongosh scripts/10_series_temporales.js
mongosh scripts/12_verificacion_completa.js
```

`06_migrar_dni_pasajes.js` solo es necesario para actualizar una base que ya contenía pasajes de una versión anterior del modelo.
En ese mismo caso, después se ejecuta `07_migrar_optimizacion_interfaz.js`. Una base nueva cargada con los scripts 02 y 04 ya contiene esos campos.

Para MongoDB Atlas o una instalación que utilice otra dirección:

```bash
mongosh "CADENA_DE_CONEXION" scripts/01_estructura.js
mongosh "CADENA_DE_CONEXION" scripts/02_datos_prueba.js
mongosh "CADENA_DE_CONEXION" scripts/03_verificacion.js
```

La contraseña no debe escribirse dentro de los scripts ni subirse al proyecto.

## Decisiones del modelo físico inicial

- Base única: `gestionpasajes`.
- Colecciones: `usuarios`, `pasajeros`, `terminales`, `recorridos`, `colectivos`, `viajes`, `reservas`, `pasajes` y `seguimientoviajes`.
- Las paradas y los tramos se embeben en `recorridos`.
- Los asientos físicos se embeben en `colectivos`.
- Cada `viaje` conserva fotografías del recorrido y del colectivo para mantener el historial.
- Cada viaje guarda `paresVenta` (por ejemplo, `MDZ|COR`) para buscar en forma directa un origen anterior a un destino y aprovechar un índice compuesto.
- La ocupación se representa por asiento y rango de paradas dentro de `viajes`.
- Las reservas son documentos separados para permitir vencimiento mediante un índice TTL.
- El pasaje guarda el pago simulado y la información histórica de la venta.
- El pasaje guarda una fotografía mínima del pasajero para permitir búsquedas directas por DNI sin perder la referencia `pasajeroId`.
- El pasaje guarda el código histórico del recorrido para producir informes de ventas sin ejecutar un `$lookup` por cada consulta.
- `pasajes.reservaId` es opcional: permite rastrear una venta originada en una reserva; una venta directa de boletería no lo necesita.
- `seguimientoviajes` es una colección time series: `fecha` es el campo temporal y `meta` identifica viaje y colectivo. Guarda mediciones históricas que se agregan, no el estado vigente que se modifica.

## Operaciones para la interfaz

Al ejecutar `08_operaciones_interfaz.js` en una sesión de `mongosh` quedan disponibles:

- `buscarViajes(origen, destino, fechaDesde, fechaHasta)`.
- `consultarAsientosDisponibles(viajeId, origen, destino)`.
- `reservarAsiento({...})`.
- `limpiarOcupacionesVencidas()`.

Las operaciones se verifican juntas con:

```bash
mongosh scripts/08_operaciones_interfaz.js scripts/09_verificacion_operaciones.js
```

La reserva bloquea el asiento mediante una actualización condicional atómica. Si no se puede crear el documento de reserva, elimina la ocupación recién agregada como compensación. De esta manera, dos solicitudes simultáneas no pueden reservar el mismo asiento para tramos superpuestos.

## Importante

Los validadores controlan estructura y tipos, pero MongoDB no comprueba automáticamente que un `ObjectId` referenciado exista en otra colección. Esa integridad se controla desde las operaciones de la aplicación y mediante los scripts de verificación.

Los datos embebidos no se actualizan todos de la misma manera: los snapshots históricos se conservan, mientras que campos derivados como `paresVenta` se regeneran al crear o modificar el viaje.

## Interfaz gráfica local

La carpeta `interfaz` contiene una aplicación web de demostración conectada directamente con la instancia local `gestionpasajes`.

```bash
cd interfaz
python3 server.py
```

Después se abre `http://127.0.0.1:4173`. La interfaz permite:

- buscar viajes por origen, destino y fecha usando `paresVenta`;
- calcular horarios de paradas intermedias desde `minutosDesdeOrigen`;
- consultar disponibilidad por asiento y tramo;
- crear reservas temporales con control atómico de doble ocupación;
- buscar pasajes directamente por documento;
- visualizar pasajeros y correos de contacto;
- ejecutar informes de ventas mediante agregaciones;
- inspeccionar los índices principales de cada colección.

La aplicación es local porque MongoDB se encuentra en `127.0.0.1:27017`; no implementa autenticación ni publica datos en Internet.
