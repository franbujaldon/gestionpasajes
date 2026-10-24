# Respaldo final verificado — 23 de octubre de 2026

El directorio `gestionpasajes/` fue generado con `mongodump` desde la instancia
local MongoDB 8.0.32. Contiene los documentos BSON, metadatos, validadores e
índices de las nueve colecciones lógicas del proyecto.

## Prueba de restauración realizada

Se restauró el respaldo en una base temporal independiente llamada
`gestionpasajes_restore_verificacion` usando remapeo de namespaces. La prueba
comparó el tipo de colección, la cantidad de documentos y la cantidad de
índices con la base original.

| Colección | Documentos | Tipo | Índices |
|---|---:|---|---:|
| colectivos | 5 | collection | 3 |
| pasajeros | 15 | collection | 2 |
| pasajes | 31 | collection | 8 |
| recorridos | 6 | collection | 3 |
| reservas | 9 | collection | 5 |
| seguimientoviajes | 24 | timeseries | 2 |
| terminales | 12 | collection | 3 |
| usuarios | 10 | collection | 2 |
| viajes | 12 | collection | 7 |

Resultado: `RESTAURACION_VERIFICADA_OK`. La colección `seguimientoviajes` se
restauró correctamente como `timeseries`, no como una colección común. La base
temporal se eliminó luego de la comprobación; este respaldo queda como evidencia
recuperable.

## Comandos de referencia

```bash
mongodump --db gestionpasajes --out backups/final_2026-10-23
mongorestore \
  --nsFrom='gestionpasajes.*' \
  --nsTo='gestionpasajes_restore_verificacion.*' \
  backups/final_2026-10-23
```

Para una restauración real sobre una base vacía puede omitirse el remapeo de
namespaces y utilizar directamente el directorio del respaldo.
