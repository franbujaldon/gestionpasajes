/* Verifica los resultados esperados del catálogo CATALOGO_MY_QUERIES.md. */

const database = db.getSiblingDB("gestionpasajes");

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const resultados = {};

resultados.viajesMdzCor = database.viajes.countDocuments({
  "recorridoSnapshot.paresVenta": "MDZ|COR",
  estado: "programado",
  fechaSalida: {
    $gte: ISODate("2026-11-15T00:00:00Z"),
    $lt: ISODate("2026-11-18T00:00:00Z")
  }
});
exigir(resultados.viajesMdzCor === 3, "01 no devuelve tres viajes.");

resultados.viajesColectivo = database.viajes.countDocuments({
  colectivoId: ObjectId("66f400000000000000000001"),
  fechaSalida: { $gte: ISODate("2026-11-01T00:00:00Z") }
});
exigir(resultados.viajesColectivo > 0, "02 no devuelve viajes.");

resultados.viajesConductor = database.viajes.countDocuments({
  conductorId: ObjectId("66f000000000000000000004"),
  fechaSalida: { $gte: ISODate("2026-11-01T00:00:00Z") }
});
exigir(resultados.viajesConductor > 0, "03 no devuelve viajes.");

resultados.pasajeroPorDni = database.pasajeros.countDocuments({
  tipoDocumento: "DNI",
  numeroDocumento: "40111222"
});
exigir(resultados.pasajeroPorDni === 1, "05 no devuelve un pasajero.");

resultados.pasajesPorDni = database.pasajes.countDocuments({
  "pasajeroSnapshot.tipoDocumento": "DNI",
  "pasajeroSnapshot.numeroDocumento": "40111222"
});
exigir(resultados.pasajesPorDni >= 1, "06 no devuelve pasajes.");

resultados.manifiesto = database.pasajes.countDocuments({
  viajeId: ObjectId("66f500000000000000000001"),
  estado: { $in: ["confirmado", "utilizado"] }
});
exigir(resultados.manifiesto === 4, "07 no devuelve cuatro pasajes.");

resultados.reservasViaje = database.reservas.countDocuments({
  viajeId: ObjectId("66f500000000000000000001"),
  estado: "confirmada"
});
exigir(resultados.reservasViaje === 1, "08 no devuelve una reserva.");

resultados.reservasPasajero = database.reservas.countDocuments({
  pasajeroId: ObjectId("66f100000000000000000001")
});
exigir(resultados.reservasPasajero >= 1, "09 no devuelve reservas.");

const ventasRecorrido = database.pasajes.aggregate([
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
  { $count: "cantidad" }
]).toArray();
resultados.ventasRecorrido = ventasRecorrido[0].cantidad;
exigir(resultados.ventasRecorrido === 9, "11 no devuelve nueve pasajes.");

const geo = database.terminales.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-68.8410, -32.8895] },
      distanceField: "distanciaMetros",
      spherical: true,
      query: { estado: "activa" }
    }
  },
  { $limit: 1 }
]).toArray();
resultados.terminalMasCercana = geo[0].codigo;
exigir(resultados.terminalMasCercana === "MDZ", "13 no devuelve MDZ primero.");

resultados.medicionesSeguimiento = database.seguimientoviajes.countDocuments({
  "meta.viajeId": ObjectId("66f500000000000000000001"),
  fecha: {
    $gte: ISODate("2026-11-15T21:00:00Z"),
    $lt: ISODate("2026-11-16T07:00:00Z")
  }
});
exigir(resultados.medicionesSeguimiento === 8, "14 no devuelve ocho mediciones.");

const plan = database.viajes.find({
  "recorridoSnapshot.paresVenta": "MDZ|COR",
  estado: "programado",
  fechaSalida: {
    $gte: ISODate("2026-11-15T00:00:00Z"),
    $lt: ISODate("2026-11-18T00:00:00Z")
  }
}).explain("executionStats");

resultados.explain = {
  clavesExaminadas: plan.executionStats.totalKeysExamined,
  documentosExaminados: plan.executionStats.totalDocsExamined,
  devueltos: plan.executionStats.nReturned
};
exigir(resultados.explain.clavesExaminadas === 3, "01 no usa el índice como se esperaba.");

printjson(resultados);
print("MY_QUERIES_VERIFICADAS_OK");

