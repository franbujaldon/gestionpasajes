#!/usr/bin/env node

/**
 * Instala en MongoDB Compass las consultas del catálogo del proyecto.
 *
 * Compass guarda las consultas de Documents en FavoriteQueries y las de
 * Aggregations en SavedPipelines. El script es idempotente: conserva todo lo
 * que ya existe y no duplica una entrada que tenga el mismo nombre. Detecta
 * las carpetas de Compass y Compass Community en Windows, Linux y macOS.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function compassDirectories() {
  let parent;

  if (process.platform === "win32") {
    parent = process.env.APPDATA;
  } else if (process.platform === "darwin") {
    parent = path.join(os.homedir(), "Library", "Application Support");
  } else {
    parent = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  }

  if (!parent) {
    throw new Error("No se pudo localizar la carpeta de configuración del usuario.");
  }

  const candidates = [
    path.join(parent, "MongoDB Compass"),
    path.join(parent, "MongoDB Compass Community"),
  ];
  const existing = candidates.filter((directory) => fs.existsSync(directory));

  if (existing.length === 0) {
    throw new Error(
      `No se encontró la configuración de Compass. Abrí Compass una vez y volvé a ejecutar el script. Rutas verificadas: ${candidates.join(", ")}`
    );
  }

  return existing;
}

const host = "localhost:27017";
const savedAt = "2026-10-23T20:45:00.000Z";
const lastModified = Date.parse(savedAt);

const oid = ($oid) => ({ $oid });
const date = ($date) => ({ $date });

const favoriteQueries = [
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111001",
    _name: "01 - viajes_mdz_cor_por_fecha",
    _ns: "gestionpasajes.viajes",
    filter: {
      "recorridoSnapshot.paresVenta": "MDZ|COR",
      estado: "programado",
      fechaSalida: {
        $gte: date("2026-11-15T00:00:00.000Z"),
        $lt: date("2026-11-18T00:00:00.000Z"),
      },
    },
    project: {
      codigo: 1,
      fechaSalida: 1,
      fechaLlegadaEstimada: 1,
      "colectivoSnapshot.numeroInterno": 1,
      "colectivoSnapshot.capacidad": 1,
    },
    sort: { fechaSalida: 1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111002",
    _name: "02 - viajes_del_colectivo_int101",
    _ns: "gestionpasajes.viajes",
    filter: {
      colectivoId: oid("66f400000000000000000001"),
      fechaSalida: { $gte: date("2026-11-01T00:00:00.000Z") },
    },
    project: { codigo: 1, fechaSalida: 1, estado: 1, colectivoSnapshot: 1 },
    sort: { fechaSalida: 1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111003",
    _name: "03 - agenda_conductor_diego",
    _ns: "gestionpasajes.viajes",
    filter: {
      conductorId: oid("66f000000000000000000004"),
      fechaSalida: { $gte: date("2026-11-01T00:00:00.000Z") },
    },
    project: {
      codigo: 1,
      fechaSalida: 1,
      estado: 1,
      "recorridoSnapshot.codigo": 1,
      "colectivoSnapshot.numeroInterno": 1,
    },
    sort: { fechaSalida: 1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111005",
    _name: "05 - pasajero_por_dni",
    _ns: "gestionpasajes.pasajeros",
    filter: { tipoDocumento: "DNI", numeroDocumento: "40111222" },
    project: { nombre: 1, apellido: 1, contacto: 1, domicilio: 1, estado: 1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111006",
    _name: "06 - pasajes_por_dni",
    _ns: "gestionpasajes.pasajes",
    filter: {
      "pasajeroSnapshot.tipoDocumento": "DNI",
      "pasajeroSnapshot.numeroDocumento": "40111222",
    },
    project: {
      codigo: 1,
      pasajeroSnapshot: 1,
      tramo: 1,
      viajeSnapshot: 1,
      pago: 1,
      estado: 1,
    },
    sort: { "viajeSnapshot.fechaSalida": -1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111008",
    _name: "08 - reservas_del_viaje_por_estado",
    _ns: "gestionpasajes.reservas",
    filter: {
      viajeId: oid("66f500000000000000000001"),
      estado: "confirmada",
    },
    project: { codigo: 1, pasajeroId: 1, asientoNumero: 1, tramo: 1, venceEn: 1 },
    sort: { venceEn: 1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111009",
    _name: "09 - historial_reservas_pasajero",
    _ns: "gestionpasajes.reservas",
    filter: { pasajeroId: oid("66f100000000000000000001") },
    project: { codigo: 1, viajeId: 1, tramo: 1, estado: 1, creadaEn: 1, venceEn: 1 },
    sort: { creadaEn: -1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111012",
    _name: "12 - ventas_por_fecha_y_canal",
    _ns: "gestionpasajes.pasajes",
    filter: {
      "venta.fecha": {
        $gte: date("2026-10-10T00:00:00.000Z"),
        $lt: date("2026-10-20T00:00:00.000Z"),
      },
      "venta.canal": "online",
    },
    project: { codigo: 1, pasajeroSnapshot: 1, viajeSnapshot: 1, venta: 1, pago: 1 },
    sort: { "venta.fecha": 1 },
  },
  {
    _id: "2a89a203-ec2f-4af4-a650-9cb513111014",
    _name: "14 - seguimiento_viaje_por_rango",
    _ns: "gestionpasajes.seguimientoviajes",
    filter: {
      "meta.viajeId": oid("66f500000000000000000001"),
      fecha: {
        $gte: date("2026-11-15T21:00:00.000Z"),
        $lt: date("2026-11-16T07:00:00.000Z"),
      },
    },
    project: {
      fecha: 1,
      "meta.viajeCodigo": 1,
      "meta.colectivoInterno": 1,
      ubicacion: 1,
      velocidadKmh: 1,
      pasajerosEstimados: 1,
      estado: 1,
    },
    sort: { fecha: 1 },
  },
].map((query) => ({
  ...query,
  _host: host,
  _lastExecuted: date(savedAt),
  _dateSaved: date(savedAt),
}));

const savedPipelines = [
  {
    id: "2a89a203-ec2f-4af4-a650-9cb513111004",
    name: "04 - asientos_libres_mdz_cor",
    namespace: "gestionpasajes.viajes",
    pipelineText: `[
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
  { $set: { cantidadDisponible: { $size: "$asientosDisponibles" } } }
]`,
  },
  {
    id: "2a89a203-ec2f-4af4-a650-9cb513111007",
    name: "07 - manifiesto_viaje_lookup",
    namespace: "gestionpasajes.pasajes",
    pipelineText: `[
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
      pasajero: { $concat: ["$pasajeroActual.apellido", ", ", "$pasajeroActual.nombre"] },
      documento: "$pasajeroActual.numeroDocumento",
      origen: "$tramo.origen",
      destino: "$tramo.destino",
      embarque: "$embarque.estado"
    }
  },
  { $sort: { asiento: 1 } }
]`,
  },
  {
    id: "2a89a203-ec2f-4af4-a650-9cb513111010",
    name: "10 - recaudacion_canal_medio",
    namespace: "gestionpasajes.pasajes",
    pipelineText: `[
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
]`,
  },
  {
    id: "2a89a203-ec2f-4af4-a650-9cb513111011",
    name: "11 - ventas_recorrido_por_fecha",
    namespace: "gestionpasajes.pasajes",
    pipelineText: `[
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
]`,
  },
  {
    id: "2a89a203-ec2f-4af4-a650-9cb513111013",
    name: "13 - terminales_cercanas_mendoza",
    namespace: "gestionpasajes.terminales",
    pipelineText: `[
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
      distanciaKm: { $round: [{ $divide: ["$distanciaMetros", 1000] }, 1] }
    }
  },
  { $project: { _id: 0, codigo: 1, nombre: 1, ciudad: 1, distanciaKm: 1 } },
  { $limit: 5 }
]`,
  },
  {
    id: "2a89a203-ec2f-4af4-a650-9cb513111015",
    name: "15 - velocidad_promedio_15_minutos",
    namespace: "gestionpasajes.seguimientoviajes",
    pipelineText: `[
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
      _id: { $dateTrunc: { date: "$fecha", unit: "minute", binSize: 15 } },
      velocidadPromedio: { $avg: "$velocidadKmh" },
      pasajerosPromedio: { $avg: "$pasajerosEstimados" },
      muestras: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]`,
  },
].map((pipeline) => ({
  ...pipeline,
  comments: false,
  autoPreview: true,
  host,
  lastModified,
}));

function readNames(directory, nameField) {
  if (!fs.existsSync(directory)) return new Set();
  const names = new Set();
  for (const file of fs.readdirSync(directory)) {
    if (!file.endsWith(".json")) continue;
    try {
      const value = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
      if (typeof value[nameField] === "string") names.add(value[nameField]);
    } catch {
      // Compass también ignora los archivos que no puede interpretar.
    }
  }
  return names;
}

function install(directory, entries, nameField, idField) {
  fs.mkdirSync(directory, { recursive: true });
  const existingNames = readNames(directory, nameField);
  let created = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (existingNames.has(entry[nameField])) {
      skipped += 1;
      continue;
    }
    const target = path.join(directory, `${entry[idField]}.json`);
    fs.writeFileSync(target, `${JSON.stringify(entry, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o664,
      flag: "wx",
    });
    created += 1;
  }
  return { created, skipped };
}

const installations = compassDirectories().map((compassData) => ({
  compassData,
  favoriteQueries: install(
    path.join(compassData, "FavoriteQueries"),
    favoriteQueries,
    "_name",
    "_id"
  ),
  savedPipelines: install(
    path.join(compassData, "SavedPipelines"),
    savedPipelines,
    "name",
    "id"
  ),
  totalVisibleInMyQueries: favoriteQueries.length + savedPipelines.length,
}));

console.log(JSON.stringify({ installations }, null, 2));
