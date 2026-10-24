/*
 * Operaciones MongoDB que utilizará la futura interfaz.
 * El archivo define funciones; no modifica datos hasta que se invoca reservarAsiento
 * o limpiarOcupacionesVencidas.
 */

const database = db.getSiblingDB("gestionpasajes");

function obtenerTramo(viaje, codigoOrigen, codigoDestino) {
  const origen = viaje.recorridoSnapshot.paradas.find(parada => parada.codigo === codigoOrigen);
  const destino = viaje.recorridoSnapshot.paradas.find(parada => parada.codigo === codigoDestino);

  if (!origen || !destino) throw new Error("El origen o el destino no pertenecen al recorrido.");
  if (origen.orden.valueOf() >= destino.orden.valueOf()) {
    throw new Error("El destino debe encontrarse después del origen.");
  }

  return {
    origenTerminalId: viaje.recorridoSnapshot.terminalesIds[origen.orden.valueOf()],
    destinoTerminalId: viaje.recorridoSnapshot.terminalesIds[destino.orden.valueOf()],
    desdeOrden: NumberInt(origen.orden.valueOf()),
    hastaOrden: NumberInt(destino.orden.valueOf()),
    origen: origen.ciudad,
    destino: destino.ciudad
  };
}

function buscarViajes(codigoOrigen, codigoDestino, fechaDesde, fechaHasta) {
  const parVenta = `${codigoOrigen}|${codigoDestino}`;
  return database.viajes.find(
    {
      "recorridoSnapshot.paresVenta": parVenta,
      estado: "programado",
      fechaSalida: { $gte: fechaDesde, $lt: fechaHasta }
    },
    {
      codigo: 1,
      fechaSalida: 1,
      fechaLlegadaEstimada: 1,
      recorridoSnapshot: 1,
      colectivoSnapshot: 1
    }
  ).sort({ fechaSalida: 1 }).toArray();
}

function consultarAsientosDisponibles(viajeId, codigoOrigen, codigoDestino, instante) {
  const ahora = instante || new Date();
  const viaje = database.viajes.findOne({ _id: viajeId, estado: "programado" });
  if (!viaje) throw new Error("No existe un viaje programado con ese identificador.");
  const tramo = obtenerTramo(viaje, codigoOrigen, codigoDestino);

  return viaje.inventarioAsientos
    .filter(asiento => !asiento.ocupaciones.some(ocupacion => {
      const activa = ocupacion.tipo !== "reserva"
        || (ocupacion.venceEn && ocupacion.venceEn > ahora);
      const superpuesta = ocupacion.desdeOrden.valueOf() < tramo.hastaOrden.valueOf()
        && ocupacion.hastaOrden.valueOf() > tramo.desdeOrden.valueOf();
      return activa && superpuesta;
    }))
    .map(asiento => asiento.numero.valueOf());
}

function reservarAsiento({
  viajeId,
  pasajeroId,
  usuarioId = null,
  asientoNumero,
  codigoOrigen,
  codigoDestino,
  canal = "online",
  minutosVigencia = 10
}) {
  if (!Number.isInteger(asientoNumero) || asientoNumero < 1) {
    throw new Error("El número de asiento es inválido.");
  }
  if (!Number.isInteger(minutosVigencia) || minutosVigencia < 1) {
    throw new Error("La vigencia de la reserva es inválida.");
  }
  if (!database.pasajeros.findOne({ _id: pasajeroId, estado: "activo" })) {
    throw new Error("El pasajero no existe o está inactivo.");
  }

  const viaje = database.viajes.findOne({ _id: viajeId, estado: "programado" });
  if (!viaje) throw new Error("El viaje no existe o no está disponible para la venta.");
  const tramo = obtenerTramo(viaje, codigoOrigen, codigoDestino);
  const ahora = new Date();
  const venceEn = new Date(ahora.getTime() + minutosVigencia * 60 * 1000);
  const reservaId = ObjectId();
  const codigo = `RES-${ahora.getTime()}-${reservaId.toString().slice(-6).toUpperCase()}`;

  const conflictoActivo = {
    desdeOrden: { $lt: tramo.hastaOrden },
    hastaOrden: { $gt: tramo.desdeOrden },
    $or: [
      { tipo: { $in: ["pasaje", "bloqueo"] } },
      { tipo: "reserva", venceEn: { $gt: ahora } }
    ]
  };

  const bloqueo = database.viajes.updateOne(
    {
      _id: viajeId,
      estado: "programado",
      inventarioAsientos: {
        $elemMatch: {
          numero: NumberInt(asientoNumero),
          ocupaciones: { $not: { $elemMatch: conflictoActivo } }
        }
      }
    },
    {
      $push: {
        "inventarioAsientos.$[asiento].ocupaciones": {
          desdeOrden: tramo.desdeOrden,
          hastaOrden: tramo.hastaOrden,
          tipo: "reserva",
          referenciaId: reservaId,
          venceEn
        }
      }
    },
    { arrayFilters: [{ "asiento.numero": NumberInt(asientoNumero) }] }
  );

  if (bloqueo.modifiedCount !== 1) {
    throw new Error("El asiento no existe o ya está ocupado en ese tramo.");
  }

  const reserva = {
    _id: reservaId,
    codigo,
    viajeId,
    pasajeroId,
    usuarioId,
    asientoNumero: NumberInt(asientoNumero),
    tramo,
    canal,
    estado: "pendiente",
    creadaEn: ahora,
    venceEn
  };

  try {
    database.reservas.insertOne(reserva);
    return reserva;
  } catch (error) {
    database.viajes.updateOne(
      { _id: viajeId },
      { $pull: { "inventarioAsientos.$[].ocupaciones": { referenciaId: reservaId } } }
    );
    throw error;
  }
}

function limpiarOcupacionesVencidas(instante) {
  const ahora = instante || new Date();
  return database.viajes.updateMany(
    { "inventarioAsientos.ocupaciones": { $elemMatch: { tipo: "reserva", venceEn: { $lte: ahora } } } },
    { $pull: { "inventarioAsientos.$[].ocupaciones": { tipo: "reserva", venceEn: { $lte: ahora } } } }
  );
}

print("Funciones disponibles: buscarViajes, consultarAsientosDisponibles, reservarAsiento y limpiarOcupacionesVencidas.");
