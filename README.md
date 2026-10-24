# gestionpasajes

Proyecto académico de Diseño de Bases de Datos II: modelado e implementación
en MongoDB de un sistema de gestión de pasajes para una empresa de colectivos de
larga distancia.

El repositorio incluye el modelo documental, validadores, datos ficticios,
índices, consultas avanzadas, series temporales, respaldo restaurable, una
interfaz web local y los informes del proyecto.

## Contenido

- `gestionpasajes/scripts`: estructura, carga de datos, migraciones, operaciones
  y verificaciones automáticas.
- `gestionpasajes/interfaz`: interfaz web y API local conectadas con MongoDB.
- `gestionpasajes/consultas`: catálogo de consultas para MongoDB Compass.
- `gestionpasajes/backups`: respaldos BSON realizados con `mongodump`.
- `gestionpasajes/informes/assets`: diagramas del modelo y la arquitectura.
- `Informe para entrega`: informe técnico para el docente.
- `Informe personal`: informe ampliado de estudio y preparación para la defensa.

Todos los nombres, documentos, correos, pagos y operaciones cargados en la base
son datos ficticios creados para la demostración académica.

## Requisitos

- MongoDB y `mongosh` disponibles localmente en `127.0.0.1:27017`.
- Python 3 para ejecutar la interfaz.
- Node.js solamente si se desea instalar automáticamente el catálogo en My
  Queries de Compass.

## Preparar la base

Desde la carpeta `gestionpasajes` se puede reconstruir el escenario completo:

```bash
mongosh scripts/01_estructura.js
mongosh scripts/02_datos_prueba.js
mongosh scripts/04_datos_ampliados.js
mongosh scripts/10_series_temporales.js
mongosh scripts/12_verificacion_completa.js
```

Como alternativa, puede restaurarse el respaldo final:

```bash
mongorestore --drop --db gestionpasajes \
  gestionpasajes/backups/final_2026-10-23/gestionpasajes
```

## Ejecutar la interfaz

```bash
cd gestionpasajes/interfaz
python3 server.py
```

Luego abrir `http://127.0.0.1:4173`.

La aplicación permite buscar viajes, consultar asientos por tramo, crear reservas
temporales, buscar pasajes por DNI, consultar pasajeros, ver informes de ventas
y revisar los índices de la base.

## MongoDB Compass

El catálogo completo se encuentra en
`gestionpasajes/consultas/CATALOGO_MY_QUERIES.md`. En Linux con Compass 1.50,
las 15 consultas pueden instalarse en el perfil local ejecutando:

```bash
node gestionpasajes/scripts/14_instalar_myqueries_compass.js
```

Las consultas guardadas en My Queries pertenecen al perfil local de Compass y
no forman parte de un `mongodump`; por eso se conservan también como catálogo y
como instalador reproducible.

## Verificación

Las comprobaciones principales son:

```bash
mongosh gestionpasajes/scripts/12_verificacion_completa.js
mongosh gestionpasajes/scripts/13_verificacion_myqueries.js
```

El detalle técnico adicional está documentado en
`gestionpasajes/README.md`.
