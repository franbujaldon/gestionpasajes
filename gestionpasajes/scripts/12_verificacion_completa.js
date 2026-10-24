/* Verificación final, de solo lectura, de estructura, datos, índices y consultas. */

const database = db.getSiblingDB("gestionpasajes");

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function buscarEtapa(plan, etapa) {
  if (!plan || typeof plan !== "object") return false;
  if (plan.stage === etapa) return true;
  return Object.values(plan).some(valor => {
    if (Array.isArray(valor)) return valor.some(elemento => buscarEtapa(elemento, etapa));
    return buscarEtapa(valor, etapa);
  });
}

const esperadas = [
  "usuarios", "pasajeros", "terminales", "recorridos", "colectivos",
  "viajes", "reservas", "pasajes", "seguimientoviajes"
];
const existentes = database.getCollectionInfos().map(info => info.name);
esperadas.forEach(nombre => exigir(existentes.includes(nombre), `Falta la colección ${nombre}.`));

const infoSerie = database.getCollectionInfos({ name: "seguimientoviajes" })[0];
exigir(infoSerie.type === "timeseries", "seguimientoviajes no es time series.");
exigir(infoSerie.options.timeseries.timeField === "fecha", "El timeField debe ser fecha.");
exigir(infoSerie.options.timeseries.metaField === "meta", "El metaField debe ser meta.");
exigir(database.seguimientoviajes.countDocuments({}) >= 24, "Faltan mediciones de seguimiento.");

const indicesRequeridos = {
  viajes: ["uq_viajes_codigo", "ix_viajes_parVenta_estado_fecha"],
  pasajes: ["uq_pasajes_codigo", "ix_pasajes_documento_pasajero"],
  reservas: ["uq_reservas_codigo", "ttl_reservas_pendientes_venceEn"],
  terminales: ["uq_terminales_codigo", "ix_terminales_ubicacion"],
  seguimientoviajes: ["ix_seguimiento_viaje_fecha"]
};
Object.entries(indicesRequeridos).forEach(([coleccion, nombres]) => {
  const disponibles = database.getCollection(coleccion).getIndexes().map(indice => indice.name);
  nombres.forEach(nombre => exigir(disponibles.includes(nombre), `Falta ${nombre} en ${coleccion}.`));
});

const referenciasSeguimiento = database.seguimientoviajes.aggregate([
  { $group: { _id: "$meta.viajeId" } },
  { $lookup: { from: "viajes", localField: "_id", foreignField: "_id", as: "viaje" } },
  { $match: { viaje: { $size: 0 } } },
  { $count: "huerfanas" }
]).toArray();
exigir(referenciasSeguimiento.length === 0, "Existen mediciones sin viaje relacionado.");

const pasajesHuerfanos = database.pasajes.aggregate([
  { $lookup: { from: "pasajeros", localField: "pasajeroId", foreignField: "_id", as: "pasajero" } },
  { $lookup: { from: "viajes", localField: "viajeId", foreignField: "_id", as: "viaje" } },
  { $match: { $or: [{ pasajero: { $size: 0 } }, { viaje: { $size: 0 } }] } },
  { $count: "huerfanos" }
]).toArray();
exigir(pasajesHuerfanos.length === 0, "Existen pasajes con referencias huérfanas.");

const filtroPrincipal = {
  "recorridoSnapshot.paresVenta": "MDZ|COR",
  estado: "programado",
  fechaSalida: { $gte: ISODate("2026-11-15T00:00:00Z") }
};
const conIndice = database.viajes.find(filtroPrincipal).explain("executionStats");
const sinIndice = database.viajes.find(filtroPrincipal).hint({ $natural: 1 }).explain("executionStats");
exigir(buscarEtapa(conIndice.queryPlanner.winningPlan, "IXSCAN"), "La consulta principal no usa IXSCAN.");
exigir(buscarEtapa(sinIndice.queryPlanner.winningPlan, "COLLSCAN"), "La prueba natural no usa COLLSCAN.");

const geo = database.terminales.aggregate([
  {
    $geoNear: {
      near: { type: "Point", coordinates: [-68.8410, -32.8895] },
      distanceField: "distanciaMetros",
      spherical: true
    }
  },
  { $limit: 1 }
]).toArray();
exigir(geo.length === 1 && geo[0].codigo === "MDZ", "La consulta geoespacial no devolvió Mendoza primero.");

const resumen = {
  versionMongoDB: db.version(),
  motor: database.serverStatus().storageEngine.name,
  colecciones: Object.fromEntries(esperadas.map(nombre => [nombre, database.getCollection(nombre).countDocuments({})])),
  indicesTotales: esperadas.reduce((total, nombre) => total + database.getCollection(nombre).getIndexes().length, 0),
  indicesPersonalizados: esperadas.reduce(
    (total, nombre) => total + database.getCollection(nombre).getIndexes().filter(indice => indice.name !== "_id_").length,
    0
  ),
  planConIndice: {
    nReturned: conIndice.executionStats.nReturned,
    totalKeysExamined: conIndice.executionStats.totalKeysExamined,
    totalDocsExamined: conIndice.executionStats.totalDocsExamined,
    executionTimeMillis: conIndice.executionStats.executionTimeMillis
  },
  planForzadoSinIndice: {
    nReturned: sinIndice.executionStats.nReturned,
    totalKeysExamined: sinIndice.executionStats.totalKeysExamined,
    totalDocsExamined: sinIndice.executionStats.totalDocsExamined,
    executionTimeMillis: sinIndice.executionStats.executionTimeMillis
  },
  terminalMasCercana: geo[0].codigo,
  estado: "VERIFICACION_COMPLETA_OK"
};

printjson(resumen);

