/*
 * Carga datos ficticios y coherentes para probar gestionpasajes.
 * Requiere ejecutar primero 01_estructura.js.
 */

const database = db.getSiblingDB("gestionpasajes");
const coleccionesRequeridas = [
  "usuarios", "pasajeros", "terminales", "recorridos",
  "colectivos", "viajes", "reservas", "pasajes"
];

const disponibles = database.getCollectionNames();
for (const nombre of coleccionesRequeridas) {
  if (!disponibles.includes(nombre)) {
    throw new Error(`Falta la colección ${nombre}. Ejecute primero 01_estructura.js.`);
  }
}

const ids = {
  usuarios: {
    administrador: ObjectId("66f000000000000000000001"),
    vendedor: ObjectId("66f000000000000000000002"),
    cliente: ObjectId("66f000000000000000000003"),
    conductor: ObjectId("66f000000000000000000004")
  },
  pasajeros: {
    ana: ObjectId("66f100000000000000000001"),
    bruno: ObjectId("66f100000000000000000002"),
    carla: ObjectId("66f100000000000000000003")
  },
  terminales: {
    mendoza: ObjectId("66f200000000000000000001"),
    sanLuis: ObjectId("66f200000000000000000002"),
    villaMercedes: ObjectId("66f200000000000000000003"),
    cordoba: ObjectId("66f200000000000000000004")
  },
  recorrido: ObjectId("66f300000000000000000001"),
  colectivo: ObjectId("66f400000000000000000001"),
  viaje: ObjectId("66f500000000000000000001"),
  reservas: {
    pendiente: ObjectId("66f600000000000000000001"),
    confirmada: ObjectId("66f600000000000000000002")
  },
  pasajes: {
    ana: ObjectId("66f700000000000000000001"),
    bruno: ObjectId("66f700000000000000000002")
  }
};

function reemplazar(coleccion, documento) {
  database.getCollection(coleccion).replaceOne(
    { _id: documento._id },
    documento,
    { upsert: true }
  );
}

const hashAcademico = "$2b$12$hashAcademicoNoValidoParaProduccion";
const fechaAlta = ISODate("2026-10-01T12:00:00Z");

reemplazar("pasajeros", {
  _id: ids.pasajeros.ana,
  tipoDocumento: "DNI",
  numeroDocumento: "40111222",
  nombre: "Ana",
  apellido: "Perez",
  fechaNacimiento: ISODate("1998-06-15T00:00:00Z"),
  nacionalidad: "Argentina",
  contacto: { email: "ana.perez@example.com", telefono: "+54 261 555 0101" },
  domicilio: { calle: "San Martin", numero: NumberInt(1200), ciudad: "Mendoza", provincia: "Mendoza" },
  fechaAlta,
  estado: "activo"
});

reemplazar("pasajeros", {
  _id: ids.pasajeros.bruno,
  tipoDocumento: "DNI",
  numeroDocumento: "38999888",
  nombre: "Bruno",
  apellido: "Gomez",
  fechaNacimiento: ISODate("1995-02-20T00:00:00Z"),
  nacionalidad: "Argentina",
  contacto: { email: "bruno.gomez@example.com", telefono: "+54 266 555 0202" },
  domicilio: { calle: "Pringles", numero: NumberInt(850), ciudad: "San Luis", provincia: "San Luis" },
  fechaAlta,
  estado: "activo"
});

reemplazar("pasajeros", {
  _id: ids.pasajeros.carla,
  tipoDocumento: "DNI",
  numeroDocumento: "42555777",
  nombre: "Carla",
  apellido: "Diaz",
  fechaNacimiento: ISODate("2001-09-08T00:00:00Z"),
  nacionalidad: "Argentina",
  contacto: { email: "carla.diaz@example.com", telefono: "+54 351 555 0303" },
  domicilio: { calle: "Colon", numero: NumberInt(300), ciudad: "Cordoba", provincia: "Cordoba" },
  fechaAlta,
  estado: "activo"
});

reemplazar("usuarios", {
  _id: ids.usuarios.administrador,
  email: "admin@empresa.test",
  passwordHash: hashAcademico,
  rol: "administrador",
  pasajeroId: null,
  perfil: { nombre: "Laura", apellido: "Suarez", telefono: "+54 261 555 1001" },
  empleado: { legajo: "ADM-001", sucursal: "Mendoza" },
  estado: "activo",
  fechaAlta,
  ultimoAcceso: null
});

reemplazar("usuarios", {
  _id: ids.usuarios.vendedor,
  email: "vendedor.mendoza@empresa.test",
  passwordHash: hashAcademico,
  rol: "vendedor",
  pasajeroId: null,
  perfil: { nombre: "Martin", apellido: "Rios", telefono: "+54 261 555 1002" },
  empleado: { legajo: "VEN-014", sucursal: "Mendoza" },
  estado: "activo",
  fechaAlta,
  ultimoAcceso: null
});

reemplazar("usuarios", {
  _id: ids.usuarios.cliente,
  email: "ana.perez@example.com",
  passwordHash: hashAcademico,
  rol: "cliente",
  pasajeroId: ids.pasajeros.ana,
  perfil: { nombre: "Ana", apellido: "Perez", telefono: "+54 261 555 0101" },
  empleado: null,
  estado: "activo",
  fechaAlta,
  ultimoAcceso: ISODate("2026-10-18T18:05:00Z")
});

reemplazar("usuarios", {
  _id: ids.usuarios.conductor,
  email: "conductor@empresa.test",
  passwordHash: hashAcademico,
  rol: "conductor",
  pasajeroId: null,
  perfil: { nombre: "Diego", apellido: "Torres", telefono: "+54 261 555 1004" },
  empleado: { legajo: "CON-008", sucursal: "Mendoza" },
  estado: "activo",
  fechaAlta,
  ultimoAcceso: null
});

const terminales = [
  {
    _id: ids.terminales.mendoza,
    codigo: "MDZ",
    nombre: "Terminal de Mendoza",
    ciudad: "Mendoza",
    provincia: "Mendoza",
    pais: "Argentina",
    direccion: { calle: "Acceso Este", numero: null, codigoPostal: "M5500" },
    ubicacion: { type: "Point", coordinates: [-68.8458, -32.8895] },
    estado: "activa"
  },
  {
    _id: ids.terminales.sanLuis,
    codigo: "LUQ",
    nombre: "Estacion de Interconexion Regional",
    ciudad: "San Luis",
    provincia: "San Luis",
    pais: "Argentina",
    direccion: { calle: "Avenida del Fundador", numero: null, codigoPostal: "D5700" },
    ubicacion: { type: "Point", coordinates: [-66.3356, -33.3017] },
    estado: "activa"
  },
  {
    _id: ids.terminales.villaMercedes,
    codigo: "VME",
    nombre: "Terminal de Villa Mercedes",
    ciudad: "Villa Mercedes",
    provincia: "San Luis",
    pais: "Argentina",
    direccion: { calle: "Avenida 25 de Mayo", numero: null, codigoPostal: "D5730" },
    ubicacion: { type: "Point", coordinates: [-65.4636, -33.6757] },
    estado: "activa"
  },
  {
    _id: ids.terminales.cordoba,
    codigo: "COR",
    nombre: "Terminal de Omnibus de Cordoba",
    ciudad: "Cordoba",
    provincia: "Cordoba",
    pais: "Argentina",
    direccion: { calle: "Boulevard Peron", numero: NumberInt(380), codigoPostal: "X5000" },
    ubicacion: { type: "Point", coordinates: [-64.1752, -31.4235] },
    estado: "activa"
  }
];

for (const terminal of terminales) reemplazar("terminales", terminal);

reemplazar("recorridos", {
  _id: ids.recorrido,
  codigo: "MDZ-CBA-01",
  nombre: "Mendoza a Cordoba via San Luis",
  estado: "activo",
  paradas: [
    { orden: NumberInt(0), terminalId: ids.terminales.mendoza, codigo: "MDZ", ciudad: "Mendoza", minutosDesdeOrigen: NumberInt(0) },
    { orden: NumberInt(1), terminalId: ids.terminales.sanLuis, codigo: "LUQ", ciudad: "San Luis", minutosDesdeOrigen: NumberInt(180) },
    { orden: NumberInt(2), terminalId: ids.terminales.villaMercedes, codigo: "VME", ciudad: "Villa Mercedes", minutosDesdeOrigen: NumberInt(285) },
    { orden: NumberInt(3), terminalId: ids.terminales.cordoba, codigo: "COR", ciudad: "Cordoba", minutosDesdeOrigen: NumberInt(570) }
  ],
  tramos: [
    { numero: NumberInt(1), desdeOrden: NumberInt(0), hastaOrden: NumberInt(1), distanciaKm: NumberInt(260), duracionMinutos: NumberInt(180), precioBase: Decimal128("18000.00") },
    { numero: NumberInt(2), desdeOrden: NumberInt(1), hastaOrden: NumberInt(2), distanciaKm: NumberInt(95), duracionMinutos: NumberInt(105), precioBase: Decimal128("12000.00") },
    { numero: NumberInt(3), desdeOrden: NumberInt(2), hastaOrden: NumberInt(3), distanciaKm: NumberInt(350), duracionMinutos: NumberInt(285), precioBase: Decimal128("25000.00") }
  ],
  fechaActualizacion: ISODate("2026-10-19T12:00:00Z")
});

const asientos = Array.from({ length: 46 }, (_, indice) => {
  const numero = indice + 1;
  return {
    numero: NumberInt(numero),
    piso: NumberInt(numero <= 12 ? 1 : 2),
    tipo: numero <= 12 ? "cama" : "semiCama",
    ubicacion: numero % 2 === 1 ? "ventana" : "pasillo",
    estado: "habilitado"
  };
});

reemplazar("colectivos", {
  _id: ids.colectivo,
  numeroInterno: "INT-101",
  patente: "AG123BC",
  marca: "Mercedes Benz",
  modelo: "O 500",
  anio: NumberInt(2024),
  capacidad: NumberInt(46),
  pisos: NumberInt(2),
  asientos,
  servicios: ["wifi", "aireAcondicionado", "banio", "cargadorUSB"],
  estado: "disponible",
  fechaAlta: ISODate("2026-09-01T12:00:00Z")
});

const ahora = new Date();
const venceEn = new Date(ahora.getTime() + 10 * 60 * 1000);
const creadaConfirmada = ISODate("2026-10-18T19:20:00Z");

reemplazar("reservas", {
  _id: ids.reservas.pendiente,
  codigo: "RES-10001",
  viajeId: ids.viaje,
  pasajeroId: ids.pasajeros.ana,
  usuarioId: ids.usuarios.cliente,
  asientoNumero: NumberInt(10),
  tramo: {
    origenTerminalId: ids.terminales.mendoza,
    destinoTerminalId: ids.terminales.sanLuis,
    desdeOrden: NumberInt(0),
    hastaOrden: NumberInt(1),
    origen: "Mendoza",
    destino: "San Luis"
  },
  canal: "online",
  estado: "pendiente",
  creadaEn: ahora,
  venceEn
});

reemplazar("reservas", {
  _id: ids.reservas.confirmada,
  codigo: "RES-10002",
  viajeId: ids.viaje,
  pasajeroId: ids.pasajeros.ana,
  usuarioId: ids.usuarios.cliente,
  asientoNumero: NumberInt(12),
  tramo: {
    origenTerminalId: ids.terminales.mendoza,
    destinoTerminalId: ids.terminales.cordoba,
    desdeOrden: NumberInt(0),
    hastaOrden: NumberInt(3),
    origen: "Mendoza",
    destino: "Cordoba"
  },
  canal: "online",
  estado: "confirmada",
  creadaEn: creadaConfirmada,
  venceEn: ISODate("2026-10-18T19:30:00Z")
});

const inventarioAsientos = asientos.map(({ numero }) => {
  const ocupaciones = [];
  if (numero.valueOf() === 10) {
    ocupaciones.push(
      {
        desdeOrden: NumberInt(0),
        hastaOrden: NumberInt(1),
        tipo: "reserva",
        referenciaId: ids.reservas.pendiente,
        venceEn
      },
      {
        desdeOrden: NumberInt(1),
        hastaOrden: NumberInt(3),
        tipo: "pasaje",
        referenciaId: ids.pasajes.bruno,
        venceEn: null
      }
    );
  }
  if (numero.valueOf() === 12) {
    ocupaciones.push({
      desdeOrden: NumberInt(0),
      hastaOrden: NumberInt(3),
      tipo: "pasaje",
      referenciaId: ids.pasajes.ana,
      venceEn: null
    });
  }
  return { numero, ocupaciones };
});

reemplazar("viajes", {
  _id: ids.viaje,
  codigo: "VIA-2026-11015-01",
  recorridoId: ids.recorrido,
  colectivoId: ids.colectivo,
  conductorId: ids.usuarios.conductor,
  fechaSalida: ISODate("2026-11-15T21:00:00Z"),
  fechaLlegadaEstimada: ISODate("2026-11-16T06:30:00Z"),
  estado: "programado",
  recorridoSnapshot: {
    codigo: "MDZ-CBA-01",
    terminalesIds: [ids.terminales.mendoza, ids.terminales.sanLuis, ids.terminales.villaMercedes, ids.terminales.cordoba],
    paresVenta: ["MDZ|LUQ", "MDZ|VME", "MDZ|COR", "LUQ|VME", "LUQ|COR", "VME|COR"],
    paradas: [
      { orden: NumberInt(0), codigo: "MDZ", ciudad: "Mendoza", minutosDesdeOrigen: NumberInt(0) },
      { orden: NumberInt(1), codigo: "LUQ", ciudad: "San Luis", minutosDesdeOrigen: NumberInt(180) },
      { orden: NumberInt(2), codigo: "VME", ciudad: "Villa Mercedes", minutosDesdeOrigen: NumberInt(285) },
      { orden: NumberInt(3), codigo: "COR", ciudad: "Cordoba", minutosDesdeOrigen: NumberInt(570) }
    ],
    preciosPorTramo: [
      { desdeOrden: NumberInt(0), hastaOrden: NumberInt(1), importe: Decimal128("18000.00") },
      { desdeOrden: NumberInt(1), hastaOrden: NumberInt(2), importe: Decimal128("12000.00") },
      { desdeOrden: NumberInt(2), hastaOrden: NumberInt(3), importe: Decimal128("25000.00") }
    ]
  },
  colectivoSnapshot: { numeroInterno: "INT-101", patente: "AG123BC", capacidad: NumberInt(46) },
  inventarioAsientos,
  fechaCreacion: ISODate("2026-10-19T15:00:00Z")
});

reemplazar("pasajes", {
  _id: ids.pasajes.ana,
  codigo: "PAS-50001",
  reservaId: ids.reservas.confirmada,
  viajeId: ids.viaje,
  pasajeroId: ids.pasajeros.ana,
  pasajeroSnapshot: {
    tipoDocumento: "DNI",
    numeroDocumento: "40111222",
    nombre: "Ana",
    apellido: "Perez"
  },
  compradorUsuarioId: ids.usuarios.cliente,
  asientoNumero: NumberInt(12),
  tramo: {
    origenTerminalId: ids.terminales.mendoza,
    destinoTerminalId: ids.terminales.cordoba,
    desdeOrden: NumberInt(0),
    hastaOrden: NumberInt(3),
    origen: "Mendoza",
    destino: "Cordoba"
  },
  viajeSnapshot: {
    codigo: "VIA-2026-11015-01",
    recorridoCodigo: "MDZ-CBA-01",
    fechaSalida: ISODate("2026-11-15T21:00:00Z"),
    colectivoInterno: "INT-101"
  },
  venta: { canal: "online", fecha: ISODate("2026-10-18T19:25:00Z"), vendedorUsuarioId: null },
  pago: {
    medio: "tarjeta",
    importe: Decimal128("55000.00"),
    moneda: "ARS",
    estado: "aprobado",
    codigoOperacion: "OP-10025",
    fecha: ISODate("2026-10-18T19:25:00Z")
  },
  estado: "confirmado",
  embarque: { estado: "pendiente", fecha: null }
});

reemplazar("pasajes", {
  _id: ids.pasajes.bruno,
  codigo: "PAS-50002",
  reservaId: null,
  viajeId: ids.viaje,
  pasajeroId: ids.pasajeros.bruno,
  pasajeroSnapshot: {
    tipoDocumento: "DNI",
    numeroDocumento: "38999888",
    nombre: "Bruno",
    apellido: "Gomez"
  },
  compradorUsuarioId: null,
  asientoNumero: NumberInt(10),
  tramo: {
    origenTerminalId: ids.terminales.sanLuis,
    destinoTerminalId: ids.terminales.cordoba,
    desdeOrden: NumberInt(1),
    hastaOrden: NumberInt(3),
    origen: "San Luis",
    destino: "Cordoba"
  },
  viajeSnapshot: {
    codigo: "VIA-2026-11015-01",
    recorridoCodigo: "MDZ-CBA-01",
    fechaSalida: ISODate("2026-11-15T21:00:00Z"),
    colectivoInterno: "INT-101"
  },
  venta: { canal: "boleteria", fecha: ISODate("2026-10-19T10:10:00Z"), vendedorUsuarioId: ids.usuarios.vendedor },
  pago: {
    medio: "efectivo",
    importe: Decimal128("37000.00"),
    moneda: "ARS",
    estado: "aprobado",
    codigoOperacion: "OP-10026",
    fecha: ISODate("2026-10-19T10:10:00Z")
  },
  estado: "confirmado",
  embarque: { estado: "pendiente", fecha: null }
});

print("Datos de prueba cargados o actualizados.");
print(`La reserva RES-10001 vence en: ${venceEn.toISOString()}`);
