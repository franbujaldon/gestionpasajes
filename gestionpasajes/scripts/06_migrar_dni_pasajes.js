/*
 * Migración para pasajes creados antes de incorporar pasajeroSnapshot.
 * No elimina documentos y puede ejecutarse más de una vez.
 */

const database = db.getSiblingDB("gestionpasajes");
let actualizados = 0;

for (const pasaje of database.pasajes.find({})) {
  const pasajero = database.pasajeros.findOne({ _id: pasaje.pasajeroId });
  if (!pasajero) {
    throw new Error(`El pasaje ${pasaje.codigo} referencia un pasajero inexistente`);
  }

  database.pasajes.updateOne(
    { _id: pasaje._id },
    {
      $set: {
        pasajeroSnapshot: {
          tipoDocumento: pasajero.tipoDocumento,
          numeroDocumento: pasajero.numeroDocumento,
          nombre: pasajero.nombre,
          apellido: pasajero.apellido
        }
      }
    }
  );
  actualizados += 1;
}

database.pasajes.createIndex(
  { "pasajeroSnapshot.tipoDocumento": 1, "pasajeroSnapshot.numeroDocumento": 1 },
  { name: "ix_pasajes_documento_pasajero" }
);

print(`Migración finalizada: ${actualizados} pasajes contienen pasajeroSnapshot.`);
print("Consulta directa disponible:");
print('db.pasajes.find({ "pasajeroSnapshot.numeroDocumento": "40111222" })');
