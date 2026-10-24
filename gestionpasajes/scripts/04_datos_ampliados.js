/*
 * Amplía los datos ficticios de gestionpasajes.
 * Requiere 01_estructura.js y 02_datos_prueba.js.
 * Es idempotente: reemplaza únicamente documentos académicos con _id fijos.
 */

const database = db.getSiblingDB("gestionpasajes");
if (database.getCollectionNames().length < 8) {
  throw new Error("Ejecute primero 01_estructura.js y 02_datos_prueba.js.");
}

function id(categoria, numero) {
  return ObjectId(`66f${categoria}${String(numero).padStart(20, "0")}`);
}

function reemplazar(coleccion, documento) {
  database.getCollection(coleccion).replaceOne(
    { _id: documento._id },
    documento,
    { upsert: true }
  );
}

function crearParesVenta(paradas) {
  const pares = [];
  for (let origen = 0; origen < paradas.length - 1; origen += 1) {
    for (let destino = origen + 1; destino < paradas.length; destino += 1) {
      pares.push(`${paradas[origen].codigo}|${paradas[destino].codigo}`);
    }
  }
  return pares;
}

const hashAcademico = "$2b$12$hashAcademicoNoValidoParaProduccion";
const fechaAlta = ISODate("2026-10-01T12:00:00Z");

const pasajerosNuevos = [
  [4, "DNI", "36222444", "Daniel", "Muñoz", "Mendoza", "Mendoza"],
  [5, "DNI", "41777111", "Elena", "Castro", "San Juan", "San Juan"],
  [6, "DNI", "33444555", "Federico", "Luna", "San Rafael", "Mendoza"],
  [7, "DNI", "44999123", "Gabriela", "Sosa", "Rosario", "Santa Fe"],
  [8, "DNI", "37888456", "Hugo", "Benitez", "Cordoba", "Cordoba"],
  [9, "DNI", "43111234", "Ines", "Romero", "Neuquen", "Neuquen"],
  [10, "DNI", "35123987", "Javier", "Acosta", "Buenos Aires", "Buenos Aires"],
  [11, "DNI", "40555654", "Karina", "Molina", "Rio Cuarto", "Cordoba"],
  [12, "DNI", "46222321", "Lucas", "Herrera", "Santa Fe", "Santa Fe"],
  [13, "PASAPORTE", "AR927451", "Mariana", "Silva", "La Rioja", "La Rioja"],
  [14, "DNI", "39111789", "Nicolas", "Vega", "Villa Mercedes", "San Luis"],
  [15, "DNI", "42888654", "Olivia", "Navarro", "Mendoza", "Mendoza"]
];

for (const [numero, tipoDocumento, documento, nombre, apellido, ciudad, provincia] of pasajerosNuevos) {
  reemplazar("pasajeros", {
    _id: id("1", numero),
    tipoDocumento,
    numeroDocumento: documento,
    nombre,
    apellido,
    fechaNacimiento: ISODate(`${1985 + (numero % 16)}-${String((numero % 9) + 1).padStart(2, "0")}-15T00:00:00Z`),
    nacionalidad: "Argentina",
    contacto: {
      email: `${nombre.toLowerCase()}.${apellido.toLowerCase().replace("ñ", "n")}@example.com`,
      telefono: `+54 9 261 555 ${String(1000 + numero).padStart(4, "0")}`
    },
    domicilio: { calle: "Calle de prueba", numero: NumberInt(100 + numero), ciudad, provincia },
    fechaAlta,
    estado: "activo"
  });
}

const usuariosNuevos = [
  [5, "bruno.gomez@example.com", "cliente", 2, "Bruno", "Gomez", null],
  [6, "carla.diaz@example.com", "cliente", 3, "Carla", "Diaz", null],
  [7, "vendedor.cordoba@empresa.test", "vendedor", null, "Paula", "Medina", { legajo: "VEN-021", sucursal: "Cordoba" }],
  [8, "conductora.elena@empresa.test", "conductor", null, "Elena", "Quiroga", { legajo: "CON-011", sucursal: "Mendoza" }],
  [9, "conductor.jorge@empresa.test", "conductor", null, "Jorge", "Paz", { legajo: "CON-012", sucursal: "Cordoba" }],
  [10, "daniel.munoz@example.com", "cliente", 4, "Daniel", "Muñoz", null]
];

for (const [numero, email, rol, pasajeroNumero, nombre, apellido, empleado] of usuariosNuevos) {
  reemplazar("usuarios", {
    _id: id("0", numero),
    email,
    passwordHash: hashAcademico,
    rol,
    pasajeroId: pasajeroNumero ? id("1", pasajeroNumero) : null,
    perfil: { nombre, apellido, telefono: `+54 9 261 600 ${String(numero).padStart(4, "0")}` },
    empleado,
    estado: "activo",
    fechaAlta,
    ultimoAcceso: null
  });
}

const terminales = [
  [1, "MDZ", "Terminal de Mendoza", "Mendoza", "Mendoza", -68.8458, -32.8895],
  [2, "LUQ", "Estacion de Interconexion Regional", "San Luis", "San Luis", -66.3356, -33.3017],
  [3, "VME", "Terminal de Villa Mercedes", "Villa Mercedes", "San Luis", -65.4636, -33.6757],
  [4, "COR", "Terminal de Omnibus de Cordoba", "Cordoba", "Cordoba", -64.1752, -31.4235],
  [5, "SJN", "Terminal de San Juan", "San Juan", "San Juan", -68.5269, -31.5375],
  [6, "SRA", "Terminal de San Rafael", "San Rafael", "Mendoza", -68.3301, -34.6177],
  [7, "BUE", "Terminal de Retiro", "Buenos Aires", "Buenos Aires", -58.3747, -34.5894],
  [8, "ROS", "Terminal Mariano Moreno", "Rosario", "Santa Fe", -60.6529, -32.9442],
  [9, "SFE", "Terminal General Manuel Belgrano", "Santa Fe", "Santa Fe", -60.7000, -31.6488],
  [10, "RCU", "Terminal de Rio Cuarto", "Rio Cuarto", "Cordoba", -64.3499, -33.1232],
  [11, "NQN", "Terminal de Neuquen", "Neuquen", "Neuquen", -68.0591, -38.9516],
  [12, "LRJ", "Terminal de La Rioja", "La Rioja", "La Rioja", -66.8558, -29.4131]
];

const terminalPorNumero = new Map();
for (const [numero, codigo, nombre, ciudad, provincia, longitud, latitud] of terminales) {
  const terminal = {
    _id: id("2", numero),
    codigo,
    nombre,
    ciudad,
    provincia,
    pais: "Argentina",
    direccion: { calle: "Acceso principal", numero: null, codigoPostal: null },
    ubicacion: { type: "Point", coordinates: [longitud, latitud] },
    estado: "activa"
  };
  reemplazar("terminales", terminal);
  terminalPorNumero.set(numero, terminal);
}

const rutas = [
  {
    numero: 1, codigo: "MDZ-CBA-01", nombre: "Mendoza a Cordoba via San Luis",
    terminales: [1, 2, 3, 4], minutos: [0, 180, 285, 570],
    tramos: [[260, 180, 18000], [95, 105, 12000], [350, 285, 25000]]
  },
  {
    numero: 2, codigo: "MDZ-SJN-01", nombre: "Mendoza a San Juan",
    terminales: [1, 5], minutos: [0, 170], tramos: [[170, 170, 16000]]
  },
  {
    numero: 3, codigo: "MDZ-NQN-01", nombre: "Mendoza a Neuquen via San Rafael",
    terminales: [1, 6, 11], minutos: [0, 210, 610],
    tramos: [[235, 210, 19000], [515, 400, 33000]]
  },
  {
    numero: 4, codigo: "MDZ-BUE-01", nombre: "Mendoza a Buenos Aires via Rosario",
    terminales: [1, 2, 10, 8, 7], minutos: [0, 180, 430, 690, 930],
    tramos: [[260, 180, 18000], [300, 250, 22000], [400, 260, 28000], [300, 240, 24000]]
  },
  {
    numero: 5, codigo: "CBA-SFE-01", nombre: "Cordoba a Santa Fe via Rosario",
    terminales: [4, 10, 8, 9], minutos: [0, 150, 390, 500],
    tramos: [[220, 150, 17000], [400, 240, 28000], [170, 110, 14000]]
  },
  {
    numero: 6, codigo: "MDZ-LRJ-01", nombre: "Mendoza a La Rioja via San Juan",
    terminales: [1, 5, 12], minutos: [0, 170, 480],
    tramos: [[170, 170, 16000], [450, 310, 30000]]
  }
];

const rutaPorNumero = new Map();
for (const ruta of rutas) {
  const paradas = ruta.terminales.map((terminalNumero, orden) => {
    const terminal = terminalPorNumero.get(terminalNumero);
    return {
      orden: NumberInt(orden),
      terminalId: terminal._id,
      codigo: terminal.codigo,
      ciudad: terminal.ciudad,
      minutosDesdeOrigen: NumberInt(ruta.minutos[orden])
    };
  });
  const tramos = ruta.tramos.map(([distancia, duracion, precio], indice) => ({
    numero: NumberInt(indice + 1),
    desdeOrden: NumberInt(indice),
    hastaOrden: NumberInt(indice + 1),
    distanciaKm: NumberInt(distancia),
    duracionMinutos: NumberInt(duracion),
    precioBase: Decimal128(precio.toFixed(2))
  }));
  const documento = {
    _id: id("3", ruta.numero),
    codigo: ruta.codigo,
    nombre: ruta.nombre,
    estado: "activo",
    paradas,
    tramos,
    fechaActualizacion: ISODate("2026-10-20T12:00:00Z")
  };
  reemplazar("recorridos", documento);
  rutaPorNumero.set(ruta.numero, { ...ruta, documento });
}

function crearAsientos(capacidad, cantidadCama) {
  return Array.from({ length: capacidad }, (_, indice) => {
    const numero = indice + 1;
    return {
      numero: NumberInt(numero),
      piso: NumberInt(capacidad > 40 && numero > 12 ? 2 : 1),
      tipo: numero <= cantidadCama ? "cama" : "semiCama",
      ubicacion: numero % 2 === 1 ? "ventana" : "pasillo",
      estado: "habilitado"
    };
  });
}

const colectivos = [
  [1, "INT-101", "AG123BC", "Mercedes Benz", "O 500", 2024, 46, 12],
  [2, "INT-102", "AF456DE", "Scania", "K450", 2023, 42, 10],
  [3, "INT-103", "AE789FG", "Volvo", "B450R", 2022, 40, 8],
  [4, "INT-104", "AH321JK", "Mercedes Benz", "O 500 RSD", 2025, 44, 12],
  [5, "INT-105", "AD654LM", "Scania", "K410", 2021, 36, 8]
];

const colectivoPorNumero = new Map();
for (const [numero, numeroInterno, patente, marca, modelo, anio, capacidad, cantidadCama] of colectivos) {
  const documento = {
    _id: id("4", numero),
    numeroInterno,
    patente,
    marca,
    modelo,
    anio: NumberInt(anio),
    capacidad: NumberInt(capacidad),
    pisos: NumberInt(capacidad > 40 ? 2 : 1),
    asientos: crearAsientos(capacidad, cantidadCama),
    servicios: ["wifi", "aireAcondicionado", "banio", "cargadorUSB"],
    estado: "disponible",
    fechaAlta: ISODate("2026-09-01T12:00:00Z")
  };
  reemplazar("colectivos", documento);
  colectivoPorNumero.set(numero, documento);
}

const viajesConfig = [
  [1, "VIA-2026-11015-01", 1, 1, 4, "2026-11-15T21:00:00Z"],
  [2, "VIA-2026-11016-01", 1, 2, 8, "2026-11-16T09:00:00Z"],
  [3, "VIA-2026-11017-01", 1, 3, 9, "2026-11-17T21:00:00Z"],
  [4, "VIA-2026-11015-02", 2, 4, 8, "2026-11-15T08:00:00Z"],
  [5, "VIA-2026-11016-02", 2, 5, 4, "2026-11-16T18:00:00Z"],
  [6, "VIA-2026-11018-01", 3, 2, 9, "2026-11-18T07:00:00Z"],
  [7, "VIA-2026-11020-01", 3, 3, 8, "2026-11-20T07:00:00Z"],
  [8, "VIA-2026-11019-01", 4, 1, 4, "2026-11-19T20:00:00Z"],
  [9, "VIA-2026-11021-01", 4, 4, 9, "2026-11-21T20:00:00Z"],
  [10, "VIA-2026-11018-02", 5, 5, 8, "2026-11-18T10:00:00Z"],
  [11, "VIA-2026-11022-01", 6, 2, 4, "2026-11-22T06:00:00Z"],
  [12, "VIA-2026-11023-01", 6, 3, 9, "2026-11-23T19:00:00Z"]
].map(([numero, codigo, ruta, colectivo, conductor, salida]) => ({ numero, codigo, ruta, colectivo, conductor, salida }));

const ahora = new Date();
const diezMinutos = new Date(ahora.getTime() + 10 * 60 * 1000);

const reservasConfig = [
  [1, 1, 1, 3, 10, 0, 1, "pendiente", "online"],
  [2, 1, 1, 3, 12, 0, 3, "confirmada", "online"],
  [3, 2, 4, 10, 7, 0, 2, "pendiente", "online"],
  [4, 4, 5, 5, 8, 0, 1, "confirmada", "online"],
  [5, 6, 6, 2, 12, 0, 2, "cancelada", "boleteria"],
  [6, 8, 7, 6, 15, 1, 4, "confirmada", "online"],
  [7, 10, 8, 6, 3, 0, 2, "pendiente", "online"],
  [8, 11, 9, 10, 20, 0, 2, "confirmada", "online"],
  [9, 3, 10, 3, 9, 0, 3, "cancelada", "online"],
  [10, 12, 11, 5, 9, 0, 2, "confirmada", "online"],
  [11, 5, 12, 10, 11, 0, 1, "confirmada", "online"],
  [12, 9, 13, 2, 18, 2, 4, "cancelada", "boleteria"]
].map(([numero, viaje, pasajero, usuario, asiento, desde, hasta, estado, canal]) => ({
  numero, viaje, pasajero, usuario, asiento, desde, hasta, estado, canal
}));

// id, viaje, pasajero, asiento, desde, hasta, canal, reserva opcional
const pasajesConfig = [
  [1, 1, 1, 12, 0, 3, "online", 2], [2, 1, 2, 10, 1, 3, "boleteria", null],
  [3, 1, 3, 5, 0, 2, "online", null], [4, 1, 4, 6, 2, 3, "boleteria", null],
  [5, 2, 5, 4, 0, 3, "online", null], [6, 2, 6, 8, 1, 3, "boleteria", null],
  [7, 3, 7, 3, 0, 1, "online", null], [8, 3, 8, 14, 0, 3, "boleteria", null],
  [9, 4, 5, 8, 0, 1, "online", 4], [10, 4, 9, 16, 0, 1, "boleteria", null],
  [11, 5, 12, 11, 0, 1, "online", 11], [12, 5, 10, 18, 0, 1, "boleteria", null],
  [13, 6, 11, 6, 0, 2, "online", null], [14, 6, 14, 22, 1, 2, "boleteria", null],
  [15, 7, 15, 7, 0, 1, "online", null], [16, 7, 3, 19, 0, 2, "boleteria", null],
  [17, 8, 7, 15, 1, 4, "online", 6], [18, 8, 4, 24, 0, 4, "boleteria", null],
  [19, 8, 8, 28, 2, 4, "online", null], [20, 9, 13, 9, 0, 2, "boleteria", null],
  [21, 9, 6, 17, 0, 4, "online", null], [22, 10, 8, 5, 0, 3, "boleteria", null],
  [23, 10, 12, 13, 1, 3, "online", null], [24, 11, 9, 20, 0, 2, "online", 8],
  [25, 11, 14, 26, 1, 2, "boleteria", null], [26, 12, 11, 9, 0, 2, "online", 10],
  [27, 12, 15, 21, 0, 1, "boleteria", null], [28, 12, 5, 30, 1, 2, "online", null],
  [29, 2, 13, 21, 0, 1, "online", null], [30, 10, 14, 27, 0, 2, "boleteria", null]
].map(([numero, viaje, pasajero, asiento, desde, hasta, canal, reserva]) => ({
  numero, viaje, pasajero, asiento, desde, hasta, canal, reserva
}));

const viajeConfigPorNumero = new Map(viajesConfig.map(viaje => [viaje.numero, viaje]));

function datosTramo(viajeNumero, desde, hasta) {
  const viajeConfig = viajeConfigPorNumero.get(viajeNumero);
  const ruta = rutaPorNumero.get(viajeConfig.ruta);
  const origen = terminalPorNumero.get(ruta.terminales[desde]);
  const destino = terminalPorNumero.get(ruta.terminales[hasta]);
  return {
    origenTerminalId: origen._id,
    destinoTerminalId: destino._id,
    desdeOrden: NumberInt(desde),
    hastaOrden: NumberInt(hasta),
    origen: origen.ciudad,
    destino: destino.ciudad
  };
}

function importeTramo(viajeNumero, desde, hasta) {
  const ruta = rutaPorNumero.get(viajeConfigPorNumero.get(viajeNumero).ruta);
  const total = ruta.tramos.slice(desde, hasta).reduce((suma, tramo) => suma + tramo[2], 0);
  return Decimal128(total.toFixed(2));
}

for (const reserva of reservasConfig) {
  const pendiente = reserva.estado === "pendiente";
  reemplazar("reservas", {
    _id: id("6", reserva.numero),
    codigo: `RES-${String(10000 + reserva.numero)}`,
    viajeId: id("5", reserva.viaje),
    pasajeroId: id("1", reserva.pasajero),
    usuarioId: id("0", reserva.usuario),
    asientoNumero: NumberInt(reserva.asiento),
    tramo: datosTramo(reserva.viaje, reserva.desde, reserva.hasta),
    canal: reserva.canal,
    estado: reserva.estado,
    creadaEn: pendiente ? ahora : ISODate("2026-10-19T15:00:00Z"),
    venceEn: pendiente ? diezMinutos : ISODate("2026-10-19T15:10:00Z")
  });
}

for (const viajeConfig of viajesConfig) {
  const ruta = rutaPorNumero.get(viajeConfig.ruta);
  const colectivo = colectivoPorNumero.get(viajeConfig.colectivo);
  const salida = ISODate(viajeConfig.salida);
  const llegada = new Date(salida.getTime() + ruta.minutos[ruta.minutos.length - 1] * 60 * 1000);
  const inventarioAsientos = colectivo.asientos.map(asiento => {
    const numeroAsiento = asiento.numero.valueOf();
    const ocupaciones = [];
    for (const reserva of reservasConfig.filter(item => item.viaje === viajeConfig.numero && item.estado === "pendiente" && item.asiento === numeroAsiento)) {
      ocupaciones.push({
        desdeOrden: NumberInt(reserva.desde),
        hastaOrden: NumberInt(reserva.hasta),
        tipo: "reserva",
        referenciaId: id("6", reserva.numero),
        venceEn: diezMinutos
      });
    }
    for (const pasaje of pasajesConfig.filter(item => item.viaje === viajeConfig.numero && item.asiento === numeroAsiento)) {
      ocupaciones.push({
        desdeOrden: NumberInt(pasaje.desde),
        hastaOrden: NumberInt(pasaje.hasta),
        tipo: "pasaje",
        referenciaId: id("7", pasaje.numero),
        venceEn: null
      });
    }
    return { numero: asiento.numero, ocupaciones };
  });

  reemplazar("viajes", {
    _id: id("5", viajeConfig.numero),
    codigo: viajeConfig.codigo,
    recorridoId: ruta.documento._id,
    colectivoId: colectivo._id,
    conductorId: id("0", viajeConfig.conductor),
    fechaSalida: salida,
    fechaLlegadaEstimada: llegada,
    estado: "programado",
    recorridoSnapshot: {
      codigo: ruta.codigo,
      terminalesIds: ruta.documento.paradas.map(parada => parada.terminalId),
      paresVenta: crearParesVenta(ruta.documento.paradas),
      paradas: ruta.documento.paradas.map(parada => ({
        orden: parada.orden,
        codigo: parada.codigo,
        ciudad: parada.ciudad,
        minutosDesdeOrigen: parada.minutosDesdeOrigen
      })),
      preciosPorTramo: ruta.documento.tramos.map(tramo => ({
        desdeOrden: tramo.desdeOrden,
        hastaOrden: tramo.hastaOrden,
        importe: tramo.precioBase
      }))
    },
    colectivoSnapshot: {
      numeroInterno: colectivo.numeroInterno,
      patente: colectivo.patente,
      capacidad: colectivo.capacidad
    },
    inventarioAsientos,
    fechaCreacion: ISODate("2026-10-20T12:00:00Z")
  });
}

const compradoresOnline = [3, 5, 6, 10];
for (const pasaje of pasajesConfig) {
  const viajeConfig = viajeConfigPorNumero.get(pasaje.viaje);
  const colectivo = colectivoPorNumero.get(viajeConfig.colectivo);
  const pasajero = database.pasajeros.findOne({ _id: id("1", pasaje.pasajero) });
  if (!pasajero) throw new Error(`No existe el pasajero ${pasaje.pasajero}`);
  const fechaVenta = ISODate(`2026-10-${String(10 + (pasaje.numero % 10)).padStart(2, "0")}T14:00:00Z`);
  const online = pasaje.canal === "online";
  reemplazar("pasajes", {
    _id: id("7", pasaje.numero),
    codigo: `PAS-${String(50000 + pasaje.numero)}`,
    reservaId: pasaje.reserva ? id("6", pasaje.reserva) : null,
    viajeId: id("5", pasaje.viaje),
    pasajeroId: id("1", pasaje.pasajero),
    pasajeroSnapshot: {
      tipoDocumento: pasajero.tipoDocumento,
      numeroDocumento: pasajero.numeroDocumento,
      nombre: pasajero.nombre,
      apellido: pasajero.apellido
    },
    compradorUsuarioId: online ? id("0", compradoresOnline[pasaje.numero % compradoresOnline.length]) : null,
    asientoNumero: NumberInt(pasaje.asiento),
    tramo: datosTramo(pasaje.viaje, pasaje.desde, pasaje.hasta),
    viajeSnapshot: {
      codigo: viajeConfig.codigo,
      recorridoCodigo: rutaPorNumero.get(viajeConfig.ruta).codigo,
      fechaSalida: ISODate(viajeConfig.salida),
      colectivoInterno: colectivo.numeroInterno
    },
    venta: {
      canal: pasaje.canal,
      fecha: fechaVenta,
      vendedorUsuarioId: online ? null : id("0", pasaje.numero % 2 === 0 ? 2 : 7)
    },
    pago: {
      medio: online ? (pasaje.numero % 2 === 0 ? "tarjeta" : "billeteraVirtual") : "efectivo",
      importe: importeTramo(pasaje.viaje, pasaje.desde, pasaje.hasta),
      moneda: "ARS",
      estado: "aprobado",
      codigoOperacion: `OP-${String(10000 + pasaje.numero)}`,
      fecha: fechaVenta
    },
    estado: "confirmado",
    embarque: { estado: "pendiente", fecha: null }
  });
}

print("Conjunto ampliado cargado o actualizado.");
printjson({
  usuarios: database.usuarios.countDocuments({}),
  pasajeros: database.pasajeros.countDocuments({}),
  terminales: database.terminales.countDocuments({}),
  recorridos: database.recorridos.countDocuments({}),
  colectivos: database.colectivos.countDocuments({}),
  viajes: database.viajes.countDocuments({}),
  reservas: database.reservas.countDocuments({}),
  pasajes: database.pasajes.countDocuments({})
});
