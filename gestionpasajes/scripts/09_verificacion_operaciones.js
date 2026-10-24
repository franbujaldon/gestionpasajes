/*
 * Prueba las operaciones de 08_operaciones_interfaz.js.
 * Debe ejecutarse en la misma llamada de mongosh y elimina la reserva de prueba al finalizar.
 */

if (typeof buscarViajes !== "function" || typeof reservarAsiento !== "function") {
  throw new Error("Ejecute juntos 08_operaciones_interfaz.js y 09_verificacion_operaciones.js.");
}

const viajePruebaId = ObjectId("66f500000000000000000001");
const pasajeroPruebaId = ObjectId("66f100000000000000000003");
let reservaPrueba = null;

try {
  const viajesEncontrados = buscarViajes(
    "MDZ",
    "COR",
    ISODate("2026-11-15T00:00:00Z"),
    ISODate("2026-11-18T00:00:00Z")
  );
  if (viajesEncontrados.length < 1) throw new Error("La búsqueda de viajes no devolvió resultados.");

  const disponiblesAntes = consultarAsientosDisponibles(viajePruebaId, "MDZ", "COR");
  if (!disponiblesAntes.includes(1)) throw new Error("El asiento de prueba debía estar disponible.");

  reservaPrueba = reservarAsiento({
    viajeId: viajePruebaId,
    pasajeroId: pasajeroPruebaId,
    asientoNumero: 1,
    codigoOrigen: "MDZ",
    codigoDestino: "COR"
  });

  const disponiblesDespues = consultarAsientosDisponibles(viajePruebaId, "MDZ", "COR");
  if (disponiblesDespues.includes(1)) throw new Error("El asiento reservado todavía aparece disponible.");

  let dobleReservaRechazada = false;
  try {
    reservarAsiento({
      viajeId: viajePruebaId,
      pasajeroId: pasajeroPruebaId,
      asientoNumero: 1,
      codigoOrigen: "MDZ",
      codigoDestino: "COR"
    });
  } catch (error) {
    dobleReservaRechazada = true;
  }
  if (!dobleReservaRechazada) throw new Error("Se permitió una doble reserva.");

  printjson({
    viajesEncontrados: viajesEncontrados.length,
    codigoReservaPrueba: reservaPrueba.codigo,
    dobleReservaRechazada
  });
  print("Verificación de operaciones finalizada correctamente.");
} finally {
  if (reservaPrueba) {
    database.reservas.deleteOne({ _id: reservaPrueba._id });
    database.viajes.updateOne(
      { _id: viajePruebaId },
      { $pull: { "inventarioAsientos.$[].ocupaciones": { referenciaId: reservaPrueba._id } } }
    );
  }
}
