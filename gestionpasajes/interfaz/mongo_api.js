/* Puente de lectura/escritura entre la interfaz local y gestionpasajes. */

const database = db.getSiblingDB("gestionpasajes");
const accion = process.env.API_ACTION || "";
const parametros = JSON.parse(process.env.API_PARAMS || "{}");

function normalizar(valor) {
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof Date) return valor.toISOString();
  if (valor && valor._bsontype === "ObjectId") return valor.toString();
  if (valor && valor._bsontype === "Decimal128") return Number(valor.toString());
  if (typeof valor === "object" && typeof valor.valueOf === "function") {
    const simple = valor.valueOf();
    if (typeof simple === "number" || typeof simple === "string" || typeof simple === "boolean") return simple;
  }
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([clave, contenido]) => [clave, normalizar(contenido)]));
  }
  return valor;
}

function responder(datos) {
  print(`__JSON__${JSON.stringify(normalizar(datos))}`);
}

function codigoValido(codigo) {
  return typeof codigo === "string" && /^[A-Z0-9]{2,5}$/.test(codigo);
}

function tramoDelViaje(viaje, origenCodigo, destinoCodigo) {
  const origen = viaje.recorridoSnapshot.paradas.find(parada => parada.codigo === origenCodigo);
  const destino = viaje.recorridoSnapshot.paradas.find(parada => parada.codigo === destinoCodigo);
  if (!origen || !destino || origen.orden.valueOf() >= destino.orden.valueOf()) {
    throw new Error("El origen y el destino no forman un tramo vendible.");
  }
  return { origen, destino };
}

function ocupacionActiva(ocupacion, ahora) {
  return ocupacion.tipo !== "reserva" || (ocupacion.venceEn && ocupacion.venceEn > ahora);
}

function seSuperpone(ocupacion, desdeOrden, hastaOrden) {
  return ocupacion.desdeOrden.valueOf() < hastaOrden && ocupacion.hastaOrden.valueOf() > desdeOrden;
}

function resumenInicial() {
  const primeraSalida = database.viajes.find({ estado: "programado" }).sort({ fechaSalida: 1 }).limit(1).toArray()[0];
  return {
    estado: "conectado",
    base: database.getName(),
    conteos: {
      viajes: database.viajes.countDocuments({ estado: "programado" }),
      pasajes: database.pasajes.countDocuments({}),
      pasajeros: database.pasajeros.countDocuments({ estado: "activo" }),
      recorridos: database.recorridos.countDocuments({ estado: "activo" })
    },
    terminales: database.terminales.find({ estado: "activa" }, { codigo: 1, ciudad: 1, nombre: 1 }).sort({ ciudad: 1 }).toArray(),
    fechaSugerida: primeraSalida ? primeraSalida.fechaSalida.toISOString().slice(0, 10) : null
  };
}

function buscarViajes() {
  const { origen, destino, fecha } = parametros;
  if (!codigoValido(origen) || !codigoValido(destino) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
    throw new Error("Los parámetros de búsqueda son inválidos.");
  }

  const inicioDia = new Date(`${fecha}T03:00:00.000Z`);
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
  const inicioConsulta = new Date(inicioDia.getTime() - 24 * 60 * 60 * 1000);
  const ahora = new Date();

  const viajes = database.viajes.aggregate([
    { $match: { "recorridoSnapshot.paresVenta": `${origen}|${destino}`, estado: "programado", fechaSalida: { $gte: inicioConsulta, $lt: finDia } } },
    { $lookup: { from: "colectivos", localField: "colectivoId", foreignField: "_id", as: "colectivo" } },
    { $set: { colectivo: { $first: "$colectivo" } } },
    { $sort: { fechaSalida: 1 } }
  ]).toArray();

  return viajes.map(viaje => {
    const { origen: paradaOrigen, destino: paradaDestino } = tramoDelViaje(viaje, origen, destino);
    const desde = paradaOrigen.orden.valueOf();
    const hasta = paradaDestino.orden.valueOf();
    const salida = new Date(viaje.fechaSalida.getTime() + paradaOrigen.minutosDesdeOrigen.valueOf() * 60000);
    const llegada = new Date(viaje.fechaSalida.getTime() + paradaDestino.minutosDesdeOrigen.valueOf() * 60000);
    const importe = viaje.recorridoSnapshot.preciosPorTramo
      .filter(tramo => tramo.desdeOrden.valueOf() >= desde && tramo.hastaOrden.valueOf() <= hasta)
      .reduce((total, tramo) => total + Number(tramo.importe.toString()), 0);
    const disponibles = viaje.inventarioAsientos.filter(asiento => !asiento.ocupaciones.some(ocupacion => ocupacionActiva(ocupacion, ahora) && seSuperpone(ocupacion, desde, hasta))).length;
    return {
      id: viaje._id,
      codigo: viaje.codigo,
      recorridoCodigo: viaje.recorridoSnapshot.codigo,
      origen: paradaOrigen.ciudad,
      destino: paradaDestino.ciudad,
      origenCodigo: origen,
      destinoCodigo: destino,
      salida,
      llegada,
      duracionMinutos: Math.round((llegada - salida) / 60000),
      importe,
      disponibles,
      capacidad: viaje.colectivoSnapshot.capacidad,
      colectivo: viaje.colectivoSnapshot.numeroInterno,
      servicios: viaje.colectivo ? viaje.colectivo.servicios : []
    };
  }).filter(viaje => viaje.salida >= inicioDia && viaje.salida < finDia);
}

function consultarAsientos() {
  const { viajeId, origen, destino } = parametros;
  if (!/^[a-f0-9]{24}$/i.test(viajeId || "") || !codigoValido(origen) || !codigoValido(destino)) throw new Error("Consulta de asientos inválida.");
  const viaje = database.viajes.findOne({ _id: ObjectId(viajeId), estado: "programado" });
  if (!viaje) throw new Error("El viaje no existe o no está programado.");
  const colectivo = database.colectivos.findOne({ _id: viaje.colectivoId });
  const { origen: paradaOrigen, destino: paradaDestino } = tramoDelViaje(viaje, origen, destino);
  const desde = paradaOrigen.orden.valueOf();
  const hasta = paradaDestino.orden.valueOf();
  const ahora = new Date();

  return {
    viaje: { id: viaje._id, codigo: viaje.codigo, origen: paradaOrigen.ciudad, destino: paradaDestino.ciudad, colectivo: viaje.colectivoSnapshot.numeroInterno },
    asientos: viaje.inventarioAsientos.map(inventario => {
      const fisico = colectivo.asientos.find(asiento => asiento.numero.valueOf() === inventario.numero.valueOf());
      const ocupado = inventario.ocupaciones.some(ocupacion => ocupacionActiva(ocupacion, ahora) && seSuperpone(ocupacion, desde, hasta));
      return {
        numero: inventario.numero,
        piso: fisico ? fisico.piso : 1,
        tipo: fisico ? fisico.tipo : "semiCama",
        ubicacion: fisico ? fisico.ubicacion : null,
        disponible: !ocupado && (!fisico || fisico.estado !== "fueraDeServicio")
      };
    })
  };
}

function buscarPasajesPorDni() {
  const dni = String(parametros.dni || "").trim();
  if (!/^[A-Za-z0-9]{5,20}$/.test(dni)) throw new Error("Documento inválido.");
  return database.pasajes.find(
    { "pasajeroSnapshot.numeroDocumento": dni },
    { codigo: 1, pasajeroSnapshot: 1, tramo: 1, viajeSnapshot: 1, asientoNumero: 1, venta: 1, pago: 1, estado: 1, embarque: 1 }
  ).sort({ "viajeSnapshot.fechaSalida": -1 }).toArray();
}

function listarPasajeros() {
  return database.pasajeros.find(
    {},
    { tipoDocumento: 1, numeroDocumento: 1, nombre: 1, apellido: 1, contacto: 1, estado: 1 }
  ).sort({ apellido: 1, nombre: 1 }).toArray();
}

function generarInformes() {
  const porCanal = database.pasajes.aggregate([
    { $group: { _id: "$venta.canal", cantidad: { $sum: 1 }, recaudacion: { $sum: "$pago.importe" } } },
    { $sort: { recaudacion: -1 } }
  ]).toArray();
  const porRecorrido = database.pasajes.aggregate([
    { $group: { _id: "$viajeSnapshot.recorridoCodigo", cantidad: { $sum: 1 }, recaudacion: { $sum: "$pago.importe" } } },
    { $sort: { recaudacion: -1 } }
  ]).toArray();
  return { porCanal, porRecorrido };
}

function listarIndices() {
  return ["viajes", "pasajes", "reservas", "pasajeros"].map(nombre => ({
    coleccion: nombre,
    indices: database.getCollection(nombre).getIndexes().map(indice => ({ nombre: indice.name, campos: indice.key, unico: !!indice.unique, ttl: indice.expireAfterSeconds ?? null }))
  }));
}

function crearReserva() {
  const { viajeId, dni, asientoNumero, origen, destino } = parametros;
  if (!/^[a-f0-9]{24}$/i.test(viajeId || "") || !Number.isInteger(asientoNumero) || asientoNumero < 1 || !codigoValido(origen) || !codigoValido(destino)) throw new Error("Datos de reserva inválidos.");
  const pasajero = database.pasajeros.findOne({ numeroDocumento: String(dni || "").trim(), estado: "activo" });
  if (!pasajero) throw new Error("No existe un pasajero activo con ese documento.");
  const viaje = database.viajes.findOne({ _id: ObjectId(viajeId), estado: "programado" });
  if (!viaje) throw new Error("El viaje no está disponible.");
  const { origen: paradaOrigen, destino: paradaDestino } = tramoDelViaje(viaje, origen, destino);
  const desde = paradaOrigen.orden.valueOf();
  const hasta = paradaDestino.orden.valueOf();
  const ahora = new Date();
  const venceEn = new Date(ahora.getTime() + 10 * 60 * 1000);
  const reservaId = ObjectId();
  const codigo = `RES-${ahora.getTime()}-${reservaId.toString().slice(-6).toUpperCase()}`;
  const conflictoActivo = { desdeOrden: { $lt: NumberInt(hasta) }, hastaOrden: { $gt: NumberInt(desde) }, $or: [{ tipo: { $in: ["pasaje", "bloqueo"] } }, { tipo: "reserva", venceEn: { $gt: ahora } }] };
  const bloqueo = database.viajes.updateOne(
    { _id: viaje._id, estado: "programado", inventarioAsientos: { $elemMatch: { numero: NumberInt(asientoNumero), ocupaciones: { $not: { $elemMatch: conflictoActivo } } } } },
    { $push: { "inventarioAsientos.$[asiento].ocupaciones": { desdeOrden: NumberInt(desde), hastaOrden: NumberInt(hasta), tipo: "reserva", referenciaId: reservaId, venceEn } } },
    { arrayFilters: [{ "asiento.numero": NumberInt(asientoNumero) }] }
  );
  if (bloqueo.modifiedCount !== 1) throw new Error("El asiento acaba de ser ocupado o no existe.");

  const reserva = {
    _id: reservaId, codigo, viajeId: viaje._id, pasajeroId: pasajero._id, usuarioId: null,
    asientoNumero: NumberInt(asientoNumero),
    tramo: {
      origenTerminalId: viaje.recorridoSnapshot.terminalesIds[desde],
      destinoTerminalId: viaje.recorridoSnapshot.terminalesIds[hasta],
      desdeOrden: NumberInt(desde), hastaOrden: NumberInt(hasta), origen: paradaOrigen.ciudad, destino: paradaDestino.ciudad
    },
    canal: "boleteria", estado: "pendiente", creadaEn: ahora, venceEn
  };
  try {
    database.reservas.insertOne(reserva);
  } catch (error) {
    database.viajes.updateOne({ _id: viaje._id }, { $pull: { "inventarioAsientos.$[].ocupaciones": { referenciaId: reservaId } } });
    throw error;
  }
  return { id: reservaId, codigo, venceEn, asientoNumero, pasajero: `${pasajero.nombre} ${pasajero.apellido}` };
}

try {
  const acciones = {
    bootstrap: resumenInicial,
    buscar_viajes: buscarViajes,
    asientos: consultarAsientos,
    pasajes_dni: buscarPasajesPorDni,
    pasajeros: listarPasajeros,
    informes: generarInformes,
    indices: listarIndices,
    reservar: crearReserva
  };
  if (!acciones[accion]) throw new Error("Acción de API desconocida.");
  responder(acciones[accion]());
} catch (error) {
  print(`__ERROR__${JSON.stringify({ error: error.message })}`);
}
