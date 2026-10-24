/*
 * Catálogo ejecutable para la demostración en mongosh o MongoDB Compass.
 * Es de solo lectura: no inserta, actualiza ni elimina documentos.
 */

const database = db.getSiblingDB("gestionpasajes");

function titulo(numero, descripcion) {
  print(`\n=== ${numero}. ${descripcion} ===`);
}

titulo(1, "Viajes disponibles Mendoza a Córdoba, con índice compuesto");
printjson(database.viajes.find(
  {
    "recorridoSnapshot.paresVenta": "MDZ|COR",
    estado: "programado",
    fechaSalida: { $gte: ISODate("2026-11-15T00:00:00Z") }
  },
  { codigo: 1, fechaSalida: 1, colectivoSnapshot: 1 }
).sort({ fechaSalida: 1 }).limit(5).toArray());

titulo(2, "Asientos libres para un tramo mediante filtros sobre arreglos embebidos");
const viajeId = ObjectId("66f500000000000000000001");
const desdeOrden = 0;
const hastaOrden = 3;
printjson(database.viajes.aggregate([
  { $match: { _id: viajeId, estado: "programado" } },
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
                            { $lt: ["$$ocupacion.desdeOrden", hastaOrden] },
                            { $gt: ["$$ocupacion.hastaOrden", desdeOrden] },
                            {
                              $or: [
                                { $in: ["$$ocupacion.tipo", ["pasaje", "bloqueo"]] },
                                { $and: [
                                  { $eq: ["$$ocupacion.tipo", "reserva"] },
                                  { $gt: ["$$ocupacion.venceEn", new Date()] }
                                ] }
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
  { $set: { cantidadDisponible: { $size: "$asientosDisponibles" } } }
]).toArray());

titulo(3, "Pasajes de un pasajero por DNI usando snapshot e índice");
printjson(database.pasajes.find(
  {
    "pasajeroSnapshot.tipoDocumento": "DNI",
    "pasajeroSnapshot.numeroDocumento": "40111222"
  },
  { codigo: 1, pasajeroSnapshot: 1, viajeSnapshot: 1, tramo: 1, pago: 1 }
).sort({ "viajeSnapshot.fechaSalida": -1 }).toArray());

titulo(4, "Manifiesto del viaje: $lookup entre pasajes y pasajeros");
printjson(database.pasajes.aggregate([
  { $match: { viajeId, estado: { $in: ["confirmado", "utilizado"] } } },
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
      pasajero: { $concat: ["$pasajeroActual.apellido", ", ", "$pasajeroActual.nombre"] },
      documento: "$pasajeroActual.numeroDocumento",
      origen: "$tramo.origen",
      destino: "$tramo.destino",
      embarque: "$embarque.estado"
    }
  },
  { $sort: { asiento: 1 } }
]).toArray());

titulo(5, "Recaudación por canal y medio de pago");
printjson(database.pasajes.aggregate([
  { $match: { estado: { $in: ["confirmado", "utilizado"] }, "pago.estado": "aprobado" } },
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
]).toArray());

titulo(6, "Ocupación por viaje con $reduce, $setUnion y cálculo porcentual");
printjson(database.viajes.aggregate([
  { $match: { estado: "programado" } },
  {
    $set: {
      asientosOcupados: {
        $size: {
          $filter: {
            input: "$inventarioAsientos",
            as: "asiento",
            cond: { $gt: [{ $size: "$$asiento.ocupaciones" }, 0] }
          }
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      codigo: 1,
      salida: "$fechaSalida",
      capacidad: "$colectivoSnapshot.capacidad",
      asientosOcupados: 1,
      ocupacionPorcentual: {
        $round: [{ $multiply: [{ $divide: ["$asientosOcupados", "$colectivoSnapshot.capacidad"] }, 100] }, 1]
      }
    }
  },
  { $sort: { ocupacionPorcentual: -1, salida: 1 } },
  { $limit: 8 }
]).toArray());

titulo(7, "Terminales cercanas a Mendoza mediante índice 2dsphere");
printjson(database.terminales.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-68.8410, -32.8895] },
      distanceField: "distanciaMetros",
      spherical: true,
      query: { estado: "activa" }
    }
  },
  { $set: { distanciaKm: { $round: [{ $divide: ["$distanciaMetros", 1000] }, 1] } } },
  { $project: { _id: 0, codigo: 1, ciudad: 1, distanciaKm: 1 } },
  { $limit: 5 }
]).toArray());

titulo(8, "Reservas por estado y alcance del índice TTL");
printjson(database.reservas.aggregate([
  {
    $group: {
      _id: "$estado",
      cantidad: { $sum: 1 },
      primerVencimiento: { $min: "$venceEn" },
      ultimoVencimiento: { $max: "$venceEn" }
    }
  },
  { $project: { _id: 0, estado: "$_id", cantidad: 1, primerVencimiento: 1, ultimoVencimiento: 1 } },
  { $sort: { estado: 1 } }
]).toArray());
printjson({
  pendientesActuales: database.reservas.countDocuments({ estado: "pendiente" }),
  indiceTTL: database.reservas.getIndexes().find(indice => indice.name === "ttl_reservas_pendientes_venceEn")
});

titulo(9, "Promedio de velocidad en ventanas de 15 minutos: time series");
printjson(database.seguimientoviajes.aggregate([
  { $match: { "meta.viajeCodigo": "VIA-2026-11015-01" } },
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
]).toArray());

titulo(10, "Plan de ejecución de la búsqueda principal");
const explicacion = database.viajes.find({
  "recorridoSnapshot.paresVenta": "MDZ|COR",
  estado: "programado",
  fechaSalida: { $gte: ISODate("2026-11-15T00:00:00Z") }
}).explain("executionStats");
printjson({
  indiceUsado: explicacion.queryPlanner.winningPlan.inputStage
    ? explicacion.queryPlanner.winningPlan.inputStage.indexName
    : explicacion.queryPlanner.winningPlan.indexName,
  nReturned: explicacion.executionStats.nReturned,
  totalKeysExamined: explicacion.executionStats.totalKeysExamined,
  totalDocsExamined: explicacion.executionStats.totalDocsExamined,
  executionTimeMillis: explicacion.executionStats.executionTimeMillis
});
