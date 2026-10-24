/* Verifica integridad y variedad del conjunto ampliado. */

const database = db.getSiblingDB("gestionpasajes");
let controles = 0;
function comprobar(condicion, mensaje) {
  controles += 1;
  if (!condicion) throw new Error(`FALLO: ${mensaje}`);
  print(`OK ${controles}: ${mensaje}`);
}

const minimos = {
  usuarios: 10, pasajeros: 15, terminales: 12, recorridos: 6,
  colectivos: 5, viajes: 12, reservas: 9, pasajes: 30
};
for (const [coleccion, minimo] of Object.entries(minimos)) {
  comprobar(database.getCollection(coleccion).countDocuments({}) >= minimo, `${coleccion} contiene al menos ${minimo} documentos`);
}

for (const recorrido of database.recorridos.find({})) {
  comprobar(recorrido.paradas.length >= 2, `${recorrido.codigo} tiene al menos origen y destino`);
  comprobar(recorrido.tramos.length === recorrido.paradas.length - 1, `${recorrido.codigo} tiene un tramo por cada par de paradas`);
  for (const parada of recorrido.paradas) {
    comprobar(database.terminales.countDocuments({ _id: parada.terminalId }) === 1, `${recorrido.codigo} referencia la terminal ${parada.codigo}`);
  }
}

for (const colectivo of database.colectivos.find({})) {
  comprobar(colectivo.asientos.length === colectivo.capacidad.valueOf(), `${colectivo.numeroInterno} tiene inventario físico completo`);
  comprobar(new Set(colectivo.asientos.map(a => a.numero.valueOf())).size === colectivo.capacidad.valueOf(), `${colectivo.numeroInterno} no repite asientos`);
}

function seSuperponen(a, b) {
  return a.desdeOrden.valueOf() < b.hastaOrden.valueOf()
    && a.hastaOrden.valueOf() > b.desdeOrden.valueOf();
}

for (const viaje of database.viajes.find({})) {
  comprobar(database.recorridos.countDocuments({ _id: viaje.recorridoId }) === 1, `${viaje.codigo} tiene recorrido válido`);
  comprobar(database.colectivos.countDocuments({ _id: viaje.colectivoId }) === 1, `${viaje.codigo} tiene colectivo válido`);
  comprobar(viaje.inventarioAsientos.length === viaje.colectivoSnapshot.capacidad.valueOf(), `${viaje.codigo} contiene todos sus asientos`);
  const paresEsperados = viaje.recorridoSnapshot.paradas.length * (viaje.recorridoSnapshot.paradas.length - 1) / 2;
  comprobar(viaje.recorridoSnapshot.paresVenta.length === paresEsperados, `${viaje.codigo} contiene todos los pares de venta ordenados`);
  comprobar(
    viaje.recorridoSnapshot.paradas.every((parada, indice, paradas) => indice === 0 || parada.minutosDesdeOrigen.valueOf() > paradas[indice - 1].minutosDesdeOrigen.valueOf()),
    `${viaje.codigo} conserva los horarios relativos de sus paradas`
  );
  for (const asiento of viaje.inventarioAsientos) {
    const activas = asiento.ocupaciones.filter(o => o.tipo !== "reserva" || (o.venceEn && o.venceEn > new Date()));
    for (let i = 0; i < activas.length; i += 1) {
      for (let j = i + 1; j < activas.length; j += 1) {
        comprobar(!seSuperponen(activas[i], activas[j]), `${viaje.codigo}, asiento ${asiento.numero}: ocupaciones compatibles`);
      }
    }
  }
}

for (const reserva of database.reservas.find({})) {
  comprobar(database.viajes.countDocuments({ _id: reserva.viajeId }) === 1, `${reserva.codigo} tiene viaje válido`);
  comprobar(database.pasajeros.countDocuments({ _id: reserva.pasajeroId }) === 1, `${reserva.codigo} tiene pasajero válido`);
  comprobar(reserva.tramo.desdeOrden.valueOf() < reserva.tramo.hastaOrden.valueOf(), `${reserva.codigo} tiene tramo ordenado`);
}

for (const pasaje of database.pasajes.find({})) {
  comprobar(database.viajes.countDocuments({ _id: pasaje.viajeId }) === 1, `${pasaje.codigo} tiene viaje válido`);
  const pasajero = database.pasajeros.findOne({ _id: pasaje.pasajeroId });
  comprobar(pasajero !== null, `${pasaje.codigo} tiene pasajero válido`);
  comprobar(
    pasajero.numeroDocumento === pasaje.pasajeroSnapshot.numeroDocumento,
    `${pasaje.codigo} conserva el documento correcto del pasajero`
  );
  const viaje = database.viajes.findOne({ _id: pasaje.viajeId });
  comprobar(
    pasaje.viajeSnapshot.recorridoCodigo === viaje.recorridoSnapshot.codigo,
    `${pasaje.codigo} conserva el código histórico del recorrido`
  );
  comprobar(pasaje.tramo.desdeOrden.valueOf() < pasaje.tramo.hastaOrden.valueOf(), `${pasaje.codigo} tiene tramo ordenado`);
}

comprobar(database.pasajes.countDocuments({ "venta.canal": "online" }) > 0, "existen ventas online");
comprobar(database.pasajes.countDocuments({ "venta.canal": "boleteria" }) > 0, "existen ventas de boletería");
comprobar(database.reservas.countDocuments({ estado: "confirmada" }) > 0, "existen reservas confirmadas persistentes");
comprobar(database.reservas.countDocuments({ estado: "cancelada" }) > 0, "existen reservas canceladas");
comprobar(
  database.pasajes.countDocuments({ "pasajeroSnapshot.numeroDocumento": "37888456" }) > 0,
  "la búsqueda directa de pasajes por DNI devuelve resultados"
);
comprobar(
  database.viajes.countDocuments({ "recorridoSnapshot.paresVenta": "MDZ|COR", estado: "programado" }) > 0,
  "la búsqueda directa Mendoza-Cordoba devuelve viajes programados"
);

const resumenCanales = database.pasajes.aggregate([
  { $group: { _id: "$venta.canal", cantidad: { $sum: 1 }, recaudacion: { $sum: "$pago.importe" } } },
  { $sort: { _id: 1 } }
]).toArray();
comprobar(resumenCanales.length === 2, "la agregación devuelve ambos canales de venta");

printjson({ resumenCanales });
print(`Verificación ampliada finalizada: ${controles} controles correctos.`);
