# Consultas para guardar en My Queries de MongoDB Compass

`My Queries` es una biblioteca local de Compass. Sus consultas no viven dentro de
la base MongoDB y no se incluyen en `mongodump`. El archivo
`scripts/11_consultas_presentacion.js` es la copia portable y versionada de la
demostración completa.

El catálogo completo, con los campos **Filter**, **Project**, **Sort** y los
pipelines listos para copiar, se encuentra en `CATALOGO_MY_QUERIES.md`.

## Instalación automática

Cerrar completamente Compass y ejecutar desde la carpeta `gestionpasajes`:

```bash
node scripts/14_instalar_myqueries_compass.js
```

El instalador detecta Compass y Compass Community en Windows, Linux y macOS.
Después de ejecutarlo, volver a abrir Compass y entrar en **My Queries**. Si no
hay Node.js disponible, usar el procedimiento manual de la sección siguiente.

## Cómo guardarlas

1. Abrir la base `gestionpasajes` y la colección indicada.
2. Ir a **Documents** para filtros `find` o a **Aggregations** para pipelines.
3. Pegar el filtro o pipeline y comprobar el resultado.
4. Presionar **Save query** y usar el nombre sugerido.
5. Abrir **My Queries** para volver a ejecutarla.

## Catálogo sugerido

| Nombre en My Queries | Colección | Tipo | Concepto demostrado |
|---|---|---|---|
| `01_viajes_mdz_cor` | `viajes` | Filter | arreglo multikey, rango, orden e índice compuesto |
| `02_asientos_libres_tramo` | `viajes` | Aggregation | `$filter`, `$map`, `$size` y superposición de rangos |
| `03_pasajes_por_dni` | `pasajes` | Filter | snapshot e índice compuesto |
| `04_manifiesto_lookup` | `pasajes` | Aggregation | `$lookup`, `$unwind`, `$project` y `$sort` |
| `05_recaudacion_canal_medio` | `pasajes` | Aggregation | `$match`, `$group`, `$avg` y `$round` |
| `06_ocupacion_por_viaje` | `viajes` | Aggregation | cálculo sobre arreglos embebidos |
| `07_terminales_cercanas` | `terminales` | Aggregation | `$geoNear` e índice `2dsphere` |
| `08_reservas_y_ttl` | `reservas` | Aggregation | estados conservados y alcance del TTL parcial |
| `09_velocidad_15_min` | `seguimientoviajes` | Aggregation | time series y `$dateTrunc` |

Los filtros y pipelines completos, ya probados, están numerados en
`scripts/11_consultas_presentacion.js`. Para la exposición conviene guardar en
Compass al menos las consultas 01, 02, 04, 05, 07 y 09: juntas muestran lectura
directa, arreglos embebidos, relaciones entre colecciones, agregación,
geolocalización y series temporales.

## Consulta de rendimiento

En `viajes`, cargar el filtro:

```javascript
{
  "recorridoSnapshot.paresVenta": "MDZ|COR",
  estado: "programado",
  fechaSalida: { $gte: ISODate("2026-11-15T00:00:00Z") }
}
```

Después elegir **Explain Plan**. El plan esperado usa
`ix_viajes_parVenta_estado_fecha` y muestra una etapa `IXSCAN`. La comparación
forzada con recorrido completo (`COLLSCAN`) se encuentra en
`scripts/12_verificacion_completa.js`, porque Compass no necesita guardarla como
consulta de uso normal.
