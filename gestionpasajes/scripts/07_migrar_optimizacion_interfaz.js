/*
 * Completa los campos redundantes incorporados para las consultas de la interfaz.
 * Se ejecuta una sola vez sobre bases creadas con una versión anterior del modelo.
 */

const database = db.getSiblingDB("gestionpasajes");

function crearParesVenta(paradas) {
  const pares = [];
  for (let origen = 0; origen < paradas.length - 1; origen += 1) {
    for (let destino = origen + 1; destino < paradas.length; destino += 1) {
      pares.push(`${paradas[origen].codigo}|${paradas[destino].codigo}`);
    }
  }
  return pares;
}

let viajesActualizados = 0;
for (const viaje of database.viajes.find({})) {
  const recorrido = database.recorridos.findOne(
    { _id: viaje.recorridoId },
    { paradas: 1 }
  );
  if (!recorrido) throw new Error(`No existe el recorrido del viaje ${viaje.codigo}`);

  const paradas = viaje.recorridoSnapshot.paradas.map(parada => {
    const paradaOriginal = recorrido.paradas.find(item => item.orden.valueOf() === parada.orden.valueOf());
    if (!paradaOriginal) throw new Error(`No se encontró la parada ${parada.codigo} de ${viaje.codigo}`);
    return {
      ...parada,
      minutosDesdeOrigen: paradaOriginal.minutosDesdeOrigen
    };
  });
  const paresVenta = crearParesVenta(paradas);
  const resultado = database.viajes.updateOne(
    { _id: viaje._id },
    { $set: { "recorridoSnapshot.paresVenta": paresVenta, "recorridoSnapshot.paradas": paradas } }
  );
  viajesActualizados += resultado.modifiedCount;
}

let pasajesActualizados = 0;
for (const pasaje of database.pasajes.find({ "viajeSnapshot.recorridoCodigo": { $exists: false } })) {
  const viaje = database.viajes.findOne(
    { _id: pasaje.viajeId },
    { "recorridoSnapshot.codigo": 1 }
  );
  if (!viaje) throw new Error(`No existe el viaje del pasaje ${pasaje.codigo}`);

  const resultado = database.pasajes.updateOne(
    { _id: pasaje._id },
    { $set: { "viajeSnapshot.recorridoCodigo": viaje.recorridoSnapshot.codigo } }
  );
  pasajesActualizados += resultado.modifiedCount;
}

printjson({ viajesActualizados, pasajesActualizados });
print("Migración para consultas de interfaz finalizada.");
