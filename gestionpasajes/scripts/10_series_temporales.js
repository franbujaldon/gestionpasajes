/*
 * Crea la colección time series seguimientoviajes y carga mediciones ficticias.
 * Las mediciones son append-only: fecha es timeField y meta es metaField.
 * El script no duplica datos si la colección ya contiene mediciones.
 */

const database = db.getSiblingDB("gestionpasajes");
const nombreColeccion = "seguimientoviajes";

const informacion = database.getCollectionInfos({ name: nombreColeccion })[0];
if (!informacion) {
  database.createCollection(nombreColeccion, {
    timeseries: {
      timeField: "fecha",
      metaField: "meta",
      granularity: "minutes"
    }
  });
  print("Colección time series creada.");
} else if (informacion.type !== "timeseries") {
  throw new Error(`${nombreColeccion} existe, pero no es una colección time series.`);
}

database.seguimientoviajes.createIndex(
  { "meta.viajeId": 1, fecha: 1 },
  { name: "ix_seguimiento_viaje_fecha" }
);

const viajesMuestra = [
  {
    viajeId: ObjectId("66f500000000000000000001"),
    viajeCodigo: "VIA-2026-11015-01",
    colectivoId: ObjectId("66f400000000000000000001"),
    colectivoInterno: "INT-101",
    puntos: [
      ["2026-11-15T21:00:00Z", -68.8410, -32.8895, 0, 31, "enTerminal"],
      ["2026-11-15T21:15:00Z", -68.7800, -32.8500, 48, 31, "enRuta"],
      ["2026-11-15T22:00:00Z", -67.9800, -32.9900, 92, 31, "enRuta"],
      ["2026-11-15T23:00:00Z", -66.8700, -33.1200, 89, 31, "enRuta"],
      ["2026-11-16T00:00:00Z", -66.0500, -33.2500, 84, 31, "enRuta"],
      ["2026-11-16T00:10:00Z", -66.3356, -33.3017, 12, 31, "enParada"],
      ["2026-11-16T01:45:00Z", -65.4600, -33.6700, 87, 30, "enRuta"],
      ["2026-11-16T06:30:00Z", -64.1888, -31.4201, 0, 30, "finalizado"]
    ]
  },
  {
    viajeId: ObjectId("66f500000000000000000002"),
    viajeCodigo: "VIA-2026-11016-01",
    colectivoId: ObjectId("66f400000000000000000002"),
    colectivoInterno: "INT-102",
    puntos: [
      ["2026-11-16T09:00:00Z", -68.8410, -32.8895, 0, 26, "enTerminal"],
      ["2026-11-16T09:15:00Z", -68.7600, -32.8600, 45, 26, "enRuta"],
      ["2026-11-16T10:00:00Z", -67.9300, -33.0000, 90, 26, "enRuta"],
      ["2026-11-16T11:00:00Z", -66.9200, -33.1200, 86, 26, "enRuta"],
      ["2026-11-16T12:00:00Z", -66.3356, -33.3017, 8, 26, "enParada"],
      ["2026-11-16T13:45:00Z", -65.4700, -33.6700, 88, 24, "enRuta"],
      ["2026-11-16T16:00:00Z", -64.8500, -32.6200, 82, 24, "enRuta"],
      ["2026-11-16T18:30:00Z", -64.1888, -31.4201, 0, 24, "finalizado"]
    ]
  },
  {
    viajeId: ObjectId("66f500000000000000000004"),
    viajeCodigo: "VIA-2026-11015-02",
    colectivoId: ObjectId("66f400000000000000000004"),
    colectivoInterno: "INT-104",
    puntos: [
      ["2026-11-15T08:00:00Z", -68.8410, -32.8895, 0, 19, "enTerminal"],
      ["2026-11-15T08:15:00Z", -68.7900, -32.8200, 43, 19, "enRuta"],
      ["2026-11-15T08:45:00Z", -68.7100, -32.4500, 78, 19, "enRuta"],
      ["2026-11-15T09:15:00Z", -68.6100, -32.1000, 80, 19, "enRuta"],
      ["2026-11-15T09:45:00Z", -68.5600, -31.8000, 75, 19, "enRuta"],
      ["2026-11-15T10:15:00Z", -68.5350, -31.6500, 62, 19, "enRuta"],
      ["2026-11-15T10:40:00Z", -68.5250, -31.5600, 30, 19, "enRuta"],
      ["2026-11-15T10:50:00Z", -68.5364, -31.5375, 0, 19, "finalizado"]
    ]
  }
];

if (database.seguimientoviajes.countDocuments({}) === 0) {
  const mediciones = viajesMuestra.flatMap(viaje => viaje.puntos.map(punto => ({
    fecha: ISODate(punto[0]),
    meta: {
      viajeId: viaje.viajeId,
      viajeCodigo: viaje.viajeCodigo,
      colectivoId: viaje.colectivoId,
      colectivoInterno: viaje.colectivoInterno,
      origen: "simulacionAcademica"
    },
    ubicacion: {
      type: "Point",
      coordinates: [punto[1], punto[2]]
    },
    velocidadKmh: NumberInt(punto[3]),
    pasajerosEstimados: NumberInt(punto[4]),
    estado: punto[5]
  })));
  database.seguimientoviajes.insertMany(mediciones);
  print(`Insertadas ${mediciones.length} mediciones.`);
} else {
  print("La colección ya contiene mediciones; no se duplicaron datos.");
}

printjson({
  tipo: database.getCollectionInfos({ name: nombreColeccion })[0].type,
  mediciones: database.seguimientoviajes.countDocuments({}),
  viajesRepresentados: database.seguimientoviajes.distinct("meta.viajeCodigo").length,
  indices: database.seguimientoviajes.getIndexes().map(indice => indice.name)
});

