/* Verificaciones automáticas del modelo y los datos de prueba. */

const database = db.getSiblingDB("gestionpasajes");
let controles = 0;

function comprobar(condicion, mensaje) {
  controles += 1;
  if (!condicion) throw new Error(`FALLO: ${mensaje}`);
  print(`OK ${controles}: ${mensaje}`);
}

const nombresEsperados = [
  "colectivos", "pasajeros", "pasajes", "recorridos",
  "reservas", "terminales", "usuarios", "viajes"
];
const nombresReales = database.getCollectionNames().filter(nombre => !nombre.startsWith("system.")).sort();
comprobar(JSON.stringify(nombresReales) === JSON.stringify(nombresEsperados), "existen exactamente las ocho colecciones del modelo");

const cantidades = {
  usuarios: 4,
  pasajeros: 3,
  terminales: 4,
  recorridos: 1,
  colectivos: 1,
  viajes: 1,
  reservas: 1,
  pasajes: 2
};

for (const [coleccion, minimo] of Object.entries(cantidades)) {
  comprobar(database.getCollection(coleccion).countDocuments({}) >= minimo, `${coleccion} contiene al menos ${minimo} documentos`);
}

const recorrido = database.recorridos.findOne({ codigo: "MDZ-CBA-01" });
comprobar(recorrido !== null, "se encuentra el recorrido MDZ-CBA-01");
comprobar(recorrido.paradas.length === 4, "el recorrido contiene cuatro paradas ordenadas");
comprobar(
  recorrido.paradas.every((parada, indice) => parada.orden.valueOf() === indice),
  "los órdenes de las paradas son consecutivos"
);
comprobar(
  recorrido.tramos.every(tramo => tramo.hastaOrden.valueOf() === tramo.desdeOrden.valueOf() + 1),
  "los tramos del recorrido unen paradas consecutivas"
);

for (const parada of recorrido.paradas) {
  comprobar(database.terminales.countDocuments({ _id: parada.terminalId }) === 1, `existe la terminal referenciada ${parada.codigo}`);
}

const colectivo = database.colectivos.findOne({ numeroInterno: "INT-101" });
comprobar(colectivo.asientos.length === colectivo.capacidad.valueOf(), "la capacidad coincide con la cantidad de asientos físicos");
comprobar(new Set(colectivo.asientos.map(asiento => asiento.numero.valueOf())).size === colectivo.capacidad.valueOf(), "los números de asiento no se repiten");

const viaje = database.viajes.findOne({ codigo: "VIA-2026-11015-01" });
comprobar(viaje !== null, "se encuentra el viaje programado");
comprobar(database.recorridos.countDocuments({ _id: viaje.recorridoId }) === 1, "el recorrido referenciado por el viaje existe");
comprobar(database.colectivos.countDocuments({ _id: viaje.colectivoId }) === 1, "el colectivo referenciado por el viaje existe");
comprobar(viaje.inventarioAsientos.length === viaje.colectivoSnapshot.capacidad.valueOf(), "el inventario del viaje contiene todos los asientos");
comprobar(viaje.recorridoSnapshot.paresVenta.includes("MDZ|COR"), "el viaje permite buscar el par Mendoza-Cordoba directamente");

function seSuperponen(a, b) {
  return a.desdeOrden.valueOf() < b.hastaOrden.valueOf()
    && a.hastaOrden.valueOf() > b.desdeOrden.valueOf();
}

for (const asiento of viaje.inventarioAsientos) {
  for (let i = 0; i < asiento.ocupaciones.length; i += 1) {
    for (let j = i + 1; j < asiento.ocupaciones.length; j += 1) {
      comprobar(!seSuperponen(asiento.ocupaciones[i], asiento.ocupaciones[j]), `el asiento ${asiento.numero} no tiene ocupaciones superpuestas`);
    }
  }
}

const asiento10 = viaje.inventarioAsientos.find(asiento => asiento.numero.valueOf() === 10);
comprobar(asiento10.ocupaciones.length === 2, "el asiento 10 demuestra reutilización por tramos");
comprobar(!seSuperponen(asiento10.ocupaciones[0], asiento10.ocupaciones[1]), "Mendoza-San Luis y San Luis-Cordoba no se superponen");

for (const reserva of database.reservas.find({})) {
  comprobar(database.viajes.countDocuments({ _id: reserva.viajeId }) === 1, `la reserva ${reserva.codigo} referencia un viaje existente`);
  comprobar(database.pasajeros.countDocuments({ _id: reserva.pasajeroId }) === 1, `la reserva ${reserva.codigo} referencia un pasajero existente`);
}

for (const pasaje of database.pasajes.find({})) {
  comprobar(database.viajes.countDocuments({ _id: pasaje.viajeId }) === 1, `el pasaje ${pasaje.codigo} referencia un viaje existente`);
  comprobar(database.pasajeros.countDocuments({ _id: pasaje.pasajeroId }) === 1, `el pasaje ${pasaje.codigo} referencia un pasajero existente`);
  const viajeDelPasaje = database.viajes.findOne({ _id: pasaje.viajeId });
  comprobar(
    pasaje.viajeSnapshot.recorridoCodigo === viajeDelPasaje.recorridoSnapshot.codigo,
    `el pasaje ${pasaje.codigo} conserva el código del recorrido`
  );
}

const ttl = database.reservas.getIndexes().find(indice => indice.name === "ttl_reservas_pendientes_venceEn");
comprobar(ttl && ttl.expireAfterSeconds.valueOf() === 0, "existe el índice TTL de reservas pendientes");
comprobar(
  JSON.stringify(ttl.partialFilterExpression) === JSON.stringify({ estado: "pendiente" }),
  "el TTL solo elimina reservas pendientes"
);

const indicesViajes = new Set(database.viajes.getIndexes().map(indice => indice.name));
const indicesPasajes = new Set(database.pasajes.getIndexes().map(indice => indice.name));
comprobar(indicesViajes.has("ix_viajes_parVenta_estado_fecha"), "existe el índice para buscar viajes por origen, destino y fecha");
comprobar(indicesViajes.has("ix_viajes_conductor_fecha"), "existe el índice para consultar la agenda de un conductor");
comprobar(indicesPasajes.has("ix_pasajes_comprador_fecha"), "existe el índice para consultar los pasajes de un comprador");
comprobar(indicesPasajes.has("ix_pasajes_recorrido_venta_fecha"), "existe el índice para informes de ventas por recorrido");

let invalidoRechazado = false;
try {
  database.pasajes.insertOne({ codigo: "DOCUMENTO-INVALIDO-DE-PRUEBA" });
} catch (error) {
  invalidoRechazado = true;
}
comprobar(invalidoRechazado, "el validador rechaza un pasaje incompleto");

print(`Verificación finalizada: ${controles} controles correctos.`);
