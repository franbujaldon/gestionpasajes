# Catálogo de My Queries para MongoDB Compass

Las consultas están probadas con los datos de `gestionpasajes`. En Compass,
abrir la colección indicada, pegar los campos en **Documents** o el pipeline en
**Aggregations**, ejecutar y elegir **Save query**.

> My Queries pertenece a Compass, no al servidor MongoDB. No se incluye en
> `mongodump`; este catálogo es la copia portable del proyecto.

## Consultas para guardar

### 01 — `viajes_mdz_cor_por_fecha`

- Colección: `viajes`
- Tipo: Documents
- Índice demostrado: `ix_viajes_parVenta_estado_fecha`

**Filter**

```javascript
{
  "recorridoSnapshot.paresVenta": "MDZ|COR",
  estado: "programado",
  fechaSalida: {
    $gte: ISODate("2026-11-15T00:00:00Z"),
    $lt: ISODate("2026-11-18T00:00:00Z")
  }
}
```

**Project**

```javascript
{
  codigo: 1,
  fechaSalida: 1,
  fechaLlegadaEstimada: 1,
  "colectivoSnapshot.numeroInterno": 1,
  "colectivoSnapshot.capacidad": 1
}
```

**Sort**

```javascript
{ fechaSalida: 1 }
```

Resultado esperado: 3 viajes. En **Explain Plan** debe aparecer `IXSCAN` sobre
`ix_viajes_parVenta_estado_fecha`.

---

### 02 — `viajes_del_colectivo_int101`

- Colección: `viajes`
- Tipo: Documents
- Índice demostrado: `ix_viajes_colectivo_fecha`

**Filter**

```javascript
{
  colectivoId: ObjectId("66f400000000000000000001"),
  fechaSalida: { $gte: ISODate("2026-11-01T00:00:00Z") }
}
```

**Project**

```javascript
{ codigo: 1, fechaSalida: 1, estado: 1, colectivoSnapshot: 1 }
```

**Sort**

```javascript
{ fechaSalida: 1 }
```

---

### 03 — `agenda_conductor_diego`

- Colección: `viajes`
- Tipo: Documents
- Índice demostrado: `ix_viajes_conductor_fecha`

**Filter**

```javascript
{
  conductorId: ObjectId("66f000000000000000000004"),
  fechaSalida: { $gte: ISODate("2026-11-01T00:00:00Z") }
}
```

**Project**

```javascript
{
  codigo: 1,
  fechaSalida: 1,
  estado: 1,
  "recorridoSnapshot.codigo": 1,
  "colectivoSnapshot.numeroInterno": 1
}
```

**Sort**

```javascript
{ fechaSalida: 1 }
```

---

### 04 — `asientos_libres_mdz_cor`

- Colección: `viajes`
- Tipo: Aggregation
- Conceptos: documentos embebidos, `$filter`, `$map`, `$size` y rangos

```javascript
[
  {
    $match: {
      _id: ObjectId("66f500000000000000000001"),
      estado: "programado"
    }
  },
  {
    $project: {
      _id: 0,
      codigo: 1,
      asientosDisponibles: {
        $map: {
          input: {
            $filter: {
              input: "$inventarioAsientos",
              as: "asiento",
              cond: {
                $eq: [
                  {
                    $size: {
                      $filter: {
                        input: "$$asiento.ocupaciones",
                        as: "ocupacion",
                        cond: {
                          $and: [
                            { $lt: ["$$ocupacion.desdeOrden", 3] },
                            { $gt: ["$$ocupacion.hastaOrden", 0] },
                            {
                              $or: [
                                { $in: ["$$ocupacion.tipo", ["pasaje", "bloqueo"]] },
                                {
                                  $and: [
                                    { $eq: ["$$ocupacion.tipo", "reserva"] },
                                    { $gt: ["$$ocupacion.venceEn", "$$NOW"] }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      }
                    }
                  },
                  0
                ]
              }
            }
          },
          as: "libre",
          in: "$$libre.numero"
        }
      }
    }
  },
  {
    $set: {
      cantidadDisponible: { $size: "$asientosDisponibles" }
    }
  }
]
```

Resultado esperado: 42 asientos disponibles para el tramo completo.

---

### 05 — `pasajero_por_dni`

- Colección: `pasajeros`
- Tipo: Documents
- Índice demostrado: `uq_pasajeros_documento`

**Filter**

```javascript
{ tipoDocumento: "DNI", numeroDocumento: "40111222" }
```

**Project**

```javascript
{ nombre: 1, apellido: 1, contacto: 1, domicilio: 1, estado: 1 }
```

---

### 06 — `pasajes_por_dni`

- Colección: `pasajes`
- Tipo: Documents
- Índice demostrado: `ix_pasajes_documento_pasajero`

**Filter**

```javascript
{
  "pasajeroSnapshot.tipoDocumento": "DNI",
  "pasajeroSnapshot.numeroDocumento": "40111222"
}
```

**Project**

```javascript
{
  codigo: 1,
  pasajeroSnapshot: 1,
  tramo: 1,
  viajeSnapshot: 1,
  pago: 1,
  estado: 1
}
```

**Sort**

```javascript
{ "viajeSnapshot.fechaSalida": -1 }
```

---

### 07 — `manifiesto_viaje_lookup`

- Colección: `pasajes`
- Tipo: Aggregation
- Índice inicial: `ix_pasajes_viaje_estado`
- Conceptos: `$lookup`, `$unwind`, `$project` y `$sort`

```javascript
[
  {
    $match: {
      viajeId: ObjectId("66f500000000000000000001"),
      estado: { $in: ["confirmado", "utilizado"] }
    }
  },
  {
    $lookup: {
      from: "pasajeros",
      localField: "pasajeroId",
      foreignField: "_id",
      as: "pasajeroActual"
    }
  },
  { $unwind: "$pasajeroActual" },
  {
    $project: {
      _id: 0,
      pasaje: "$codigo",
      asiento: "$asientoNumero",
      pasajero: {
        $concat: ["$pasajeroActual.apellido", ", ", "$pasajeroActual.nombre"]
      },
      documento: "$pasajeroActual.numeroDocumento",
      origen: "$tramo.origen",
      destino: "$tramo.destino",
      embarque: "$embarque.estado"
    }
  },
  { $sort: { asiento: 1 } }
]
```

Resultado esperado: 4 pasajeros.

---

### 08 — `reservas_del_viaje_por_estado`

- Colección: `reservas`
- Tipo: Documents
- Índice demostrado: `ix_reservas_viaje_estado_vencimiento`

**Filter**

```javascript
{
  viajeId: ObjectId("66f500000000000000000001"),
  estado: "confirmada"
}
```

**Project**

```javascript
{ codigo: 1, pasajeroId: 1, asientoNumero: 1, tramo: 1, venceEn: 1 }
```

**Sort**

```javascript
{ venceEn: 1 }
```

---

### 09 — `historial_reservas_pasajero`

- Colección: `reservas`
- Tipo: Documents
- Índice demostrado: `ix_reservas_pasajero_fecha`

**Filter**

```javascript
{ pasajeroId: ObjectId("66f100000000000000000001") }
```

**Project**

```javascript
{ codigo: 1, viajeId: 1, tramo: 1, estado: 1, creadaEn: 1, venceEn: 1 }
```

**Sort**

```javascript
{ creadaEn: -1 }
```

---

### 10 — `recaudacion_canal_medio`

- Colección: `pasajes`
- Tipo: Aggregation
- Conceptos: `$match`, `$group`, `$sum`, `$avg`, `$round`

```javascript
[
  {
    $match: {
      estado: { $in: ["confirmado", "utilizado"] },
      "pago.estado": "aprobado"
    }
  },
  {
    $group: {
      _id: { canal: "$venta.canal", medio: "$pago.medio" },
      pasajes: { $sum: 1 },
      recaudacion: { $sum: "$pago.importe" },
      importePromedio: { $avg: "$pago.importe" }
    }
  },
  {
    $project: {
      _id: 0,
      canal: "$_id.canal",
      medio: "$_id.medio",
      pasajes: 1,
      recaudacion: 1,
      importePromedio: { $round: ["$importePromedio", 2] }
    }
  },
  { $sort: { recaudacion: -1 } }
]
```

---

### 11 — `ventas_recorrido_por_fecha`

- Colección: `pasajes`
- Tipo: Aggregation
- Índice inicial: `ix_pasajes_recorrido_venta_fecha`

```javascript
[
  {
    $match: {
      "viajeSnapshot.recorridoCodigo": "MDZ-CBA-01",
      "venta.fecha": {
        $gte: ISODate("2026-10-01T00:00:00Z"),
        $lt: ISODate("2026-11-01T00:00:00Z")
      },
      "pago.estado": "aprobado"
    }
  },
  {
    $group: {
      _id: "$viajeSnapshot.recorridoCodigo",
      pasajes: { $sum: 1 },
      recaudacion: { $sum: "$pago.importe" }
    }
  },
  { $project: { _id: 0, recorrido: "$_id", pasajes: 1, recaudacion: 1 } }
]
```

Resultado esperado: 9 pasajes para `MDZ-CBA-01`.

---

### 12 — `ventas_por_fecha_y_canal`

- Colección: `pasajes`
- Tipo: Documents
- Índice demostrado: `ix_pasajes_venta_fecha_canal`

**Filter**

```javascript
{
  "venta.fecha": {
    $gte: ISODate("2026-10-10T00:00:00Z"),
    $lt: ISODate("2026-10-20T00:00:00Z")
  },
  "venta.canal": "online"
}
```

**Project**

```javascript
{ codigo: 1, pasajeroSnapshot: 1, viajeSnapshot: 1, venta: 1, pago: 1 }
```

**Sort**

```javascript
{ "venta.fecha": 1 }
```

---

### 13 — `terminales_cercanas_mendoza`

- Colección: `terminales`
- Tipo: Aggregation
- Índice demostrado: `ix_terminales_ubicacion`

```javascript
[
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-68.8410, -32.8895] },
      distanceField: "distanciaMetros",
      spherical: true,
      query: { estado: "activa" }
    }
  },
  {
    $set: {
      distanciaKm: {
        $round: [{ $divide: ["$distanciaMetros", 1000] }, 1]
      }
    }
  },
  { $project: { _id: 0, codigo: 1, nombre: 1, ciudad: 1, distanciaKm: 1 } },
  { $limit: 5 }
]
```

Resultado esperado: `MDZ` aparece primero.

---

### 14 — `seguimiento_viaje_por_rango`

- Colección: `seguimientoviajes`
- Tipo: Documents
- Índice demostrado: `ix_seguimiento_viaje_fecha`

**Filter**

```javascript
{
  "meta.viajeId": ObjectId("66f500000000000000000001"),
  fecha: {
    $gte: ISODate("2026-11-15T21:00:00Z"),
    $lt: ISODate("2026-11-16T07:00:00Z")
  }
}
```

**Project**

```javascript
{
  fecha: 1,
  "meta.viajeCodigo": 1,
  "meta.colectivoInterno": 1,
  ubicacion: 1,
  velocidadKmh: 1,
  pasajerosEstimados: 1,
  estado: 1
}
```

**Sort**

```javascript
{ fecha: 1 }
```

Resultado esperado: 8 mediciones.

---

### 15 — `velocidad_promedio_15_minutos`

- Colección: `seguimientoviajes`
- Tipo: Aggregation
- Conceptos: time series, `$dateTrunc`, `$avg`

```javascript
[
  {
    $match: {
      "meta.viajeId": ObjectId("66f500000000000000000001"),
      fecha: {
        $gte: ISODate("2026-11-15T21:00:00Z"),
        $lt: ISODate("2026-11-16T07:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: {
        $dateTrunc: { date: "$fecha", unit: "minute", binSize: 15 }
      },
      velocidadPromedio: { $avg: "$velocidadKmh" },
      pasajerosPromedio: { $avg: "$pasajerosEstimados" },
      muestras: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]
```

## Orden recomendado para la exposición

Guardar como favoritas: 01, 04, 06, 07, 10, 13, 14 y 15. En conjunto demuestran
un índice compuesto multikey, documentos embebidos, snapshots, relaciones con
`$lookup`, agrupaciones, GeoJSON y series temporales.

