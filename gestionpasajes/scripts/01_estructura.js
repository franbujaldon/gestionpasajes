/*
 * Crea o actualiza la estructura de gestionpasajes.
 * Es idempotente y no elimina datos existentes.
 */

const database = db.getSiblingDB("gestionpasajes");

function aplicarColeccion(nombre, jsonSchema) {
  const validator = { $jsonSchema: jsonSchema };
  const existe = database.getCollectionInfos({ name: nombre }).length === 1;

  if (existe) {
    const resultado = database.runCommand({
      collMod: nombre,
      validator,
      validationLevel: "strict",
      validationAction: "error"
    });
    if (!resultado.ok) throw new Error(`No se pudo actualizar ${nombre}`);
    print(`Actualizada: ${nombre}`);
  } else {
    database.createCollection(nombre, {
      validator,
      validationLevel: "strict",
      validationAction: "error"
    });
    print(`Creada: ${nombre}`);
  }
}

const referenciaOpcional = { bsonType: ["objectId", "null"] };
const fechaOpcional = { bsonType: ["date", "null"] };

aplicarColeccion("usuarios", {
  bsonType: "object",
  title: "Usuario del sistema",
  required: ["email", "passwordHash", "rol", "estado", "fechaAlta"],
  properties: {
    _id: { bsonType: "objectId" },
    email: { bsonType: "string" },
    passwordHash: { bsonType: "string", minLength: 20 },
    rol: { enum: ["administrador", "vendedor", "cliente", "conductor"] },
    pasajeroId: referenciaOpcional,
    perfil: {
      bsonType: "object",
      properties: {
        nombre: { bsonType: "string" },
        apellido: { bsonType: "string" },
        telefono: { bsonType: ["string", "null"] }
      }
    },
    empleado: {
      bsonType: ["object", "null"],
      properties: {
        legajo: { bsonType: "string" },
        sucursal: { bsonType: "string" }
      }
    },
    estado: { enum: ["activo", "bloqueado", "inactivo"] },
    fechaAlta: { bsonType: "date" },
    ultimoAcceso: fechaOpcional
  }
});

aplicarColeccion("pasajeros", {
  bsonType: "object",
  title: "Persona que viaja",
  required: ["tipoDocumento", "numeroDocumento", "nombre", "apellido", "fechaAlta", "estado"],
  properties: {
    _id: { bsonType: "objectId" },
    tipoDocumento: { enum: ["DNI", "PASAPORTE", "CEDULA"] },
    numeroDocumento: { bsonType: "string", minLength: 5 },
    nombre: { bsonType: "string" },
    apellido: { bsonType: "string" },
    fechaNacimiento: fechaOpcional,
    nacionalidad: { bsonType: ["string", "null"] },
    contacto: {
      bsonType: "object",
      properties: {
        email: { bsonType: ["string", "null"] },
        telefono: { bsonType: ["string", "null"] }
      }
    },
    domicilio: {
      bsonType: ["object", "null"],
      properties: {
        calle: { bsonType: "string" },
        numero: { bsonType: ["int", "long", "string", "null"] },
        ciudad: { bsonType: "string" },
        provincia: { bsonType: "string" }
      }
    },
    fechaAlta: { bsonType: "date" },
    estado: { enum: ["activo", "inactivo"] }
  }
});

aplicarColeccion("terminales", {
  bsonType: "object",
  title: "Terminal o punto operativo",
  required: ["codigo", "nombre", "ciudad", "provincia", "pais", "ubicacion", "estado"],
  properties: {
    _id: { bsonType: "objectId" },
    codigo: { bsonType: "string" },
    nombre: { bsonType: "string" },
    ciudad: { bsonType: "string" },
    provincia: { bsonType: "string" },
    pais: { bsonType: "string" },
    direccion: {
      bsonType: "object",
      properties: {
        calle: { bsonType: "string" },
        numero: { bsonType: ["int", "long", "string", "null"] },
        codigoPostal: { bsonType: ["string", "null"] }
      }
    },
    ubicacion: {
      bsonType: "object",
      required: ["type", "coordinates"],
      properties: {
        type: { enum: ["Point"] },
        coordinates: {
          bsonType: "array",
          minItems: 2,
          maxItems: 2,
          items: { bsonType: ["double", "int", "long", "decimal"] }
        }
      }
    },
    estado: { enum: ["activa", "inactiva"] }
  }
});

aplicarColeccion("recorridos", {
  bsonType: "object",
  title: "Itinerario reutilizable",
  required: ["codigo", "nombre", "estado", "paradas", "tramos", "fechaActualizacion"],
  properties: {
    _id: { bsonType: "objectId" },
    codigo: { bsonType: "string" },
    nombre: { bsonType: "string" },
    estado: { enum: ["activo", "inactivo"] },
    paradas: {
      bsonType: "array",
      minItems: 2,
      items: {
        bsonType: "object",
        required: ["orden", "terminalId", "codigo", "ciudad", "minutosDesdeOrigen"],
        properties: {
          orden: { bsonType: "int", minimum: 0 },
          terminalId: { bsonType: "objectId" },
          codigo: { bsonType: "string" },
          ciudad: { bsonType: "string" },
          minutosDesdeOrigen: { bsonType: "int", minimum: 0 }
        }
      }
    },
    tramos: {
      bsonType: "array",
      minItems: 1,
      items: {
        bsonType: "object",
        required: ["numero", "desdeOrden", "hastaOrden", "distanciaKm", "duracionMinutos", "precioBase"],
        properties: {
          numero: { bsonType: "int", minimum: 1 },
          desdeOrden: { bsonType: "int", minimum: 0 },
          hastaOrden: { bsonType: "int", minimum: 1 },
          distanciaKm: { bsonType: ["int", "long", "double", "decimal"], minimum: 0 },
          duracionMinutos: { bsonType: "int", minimum: 1 },
          precioBase: { bsonType: "decimal" }
        }
      }
    },
    fechaActualizacion: { bsonType: "date" }
  }
});

aplicarColeccion("colectivos", {
  bsonType: "object",
  title: "Vehículo y distribución física",
  required: ["numeroInterno", "patente", "marca", "modelo", "anio", "capacidad", "pisos", "asientos", "estado", "fechaAlta"],
  properties: {
    _id: { bsonType: "objectId" },
    numeroInterno: { bsonType: "string" },
    patente: { bsonType: "string" },
    marca: { bsonType: "string" },
    modelo: { bsonType: "string" },
    anio: { bsonType: "int", minimum: 1990 },
    capacidad: { bsonType: "int", minimum: 1 },
    pisos: { bsonType: "int", minimum: 1, maximum: 2 },
    asientos: {
      bsonType: "array",
      minItems: 1,
      items: {
        bsonType: "object",
        required: ["numero", "piso", "tipo", "ubicacion"],
        properties: {
          numero: { bsonType: "int", minimum: 1 },
          piso: { bsonType: "int", minimum: 1, maximum: 2 },
          tipo: { enum: ["semiCama", "cama", "suite"] },
          ubicacion: { enum: ["ventana", "pasillo"] },
          estado: { enum: ["habilitado", "fueraDeServicio"] }
        }
      }
    },
    servicios: { bsonType: "array", items: { bsonType: "string" } },
    estado: { enum: ["disponible", "mantenimiento", "inactivo"] },
    fechaAlta: { bsonType: "date" }
  }
});

const paradaSnapshot = {
  bsonType: "object",
  required: ["orden", "codigo", "ciudad", "minutosDesdeOrigen"],
  properties: {
    orden: { bsonType: "int", minimum: 0 },
    codigo: { bsonType: "string" },
    ciudad: { bsonType: "string" },
    minutosDesdeOrigen: { bsonType: "int", minimum: 0 }
  }
};

const ocupacion = {
  bsonType: "object",
  required: ["desdeOrden", "hastaOrden", "tipo", "referenciaId"],
  properties: {
    desdeOrden: { bsonType: "int", minimum: 0 },
    hastaOrden: { bsonType: "int", minimum: 1 },
    tipo: { enum: ["reserva", "pasaje", "bloqueo"] },
    referenciaId: { bsonType: "objectId" },
    venceEn: fechaOpcional
  }
};

aplicarColeccion("viajes", {
  bsonType: "object",
  title: "Ejecución programada de un recorrido",
  required: ["codigo", "recorridoId", "colectivoId", "fechaSalida", "fechaLlegadaEstimada", "estado", "recorridoSnapshot", "colectivoSnapshot", "inventarioAsientos", "fechaCreacion"],
  properties: {
    _id: { bsonType: "objectId" },
    codigo: { bsonType: "string" },
    recorridoId: { bsonType: "objectId" },
    colectivoId: { bsonType: "objectId" },
    conductorId: referenciaOpcional,
    fechaSalida: { bsonType: "date" },
    fechaLlegadaEstimada: { bsonType: "date" },
    estado: { enum: ["programado", "enCurso", "finalizado", "cancelado"] },
    recorridoSnapshot: {
      bsonType: "object",
      required: ["codigo", "terminalesIds", "paresVenta", "paradas", "preciosPorTramo"],
      properties: {
        codigo: { bsonType: "string" },
        terminalesIds: { bsonType: "array", minItems: 2, items: { bsonType: "objectId" } },
        paresVenta: {
          bsonType: "array",
          minItems: 1,
          uniqueItems: true,
          items: { bsonType: "string", pattern: "^[A-Z0-9]+\\|[A-Z0-9]+$" }
        },
        paradas: { bsonType: "array", minItems: 2, items: paradaSnapshot },
        preciosPorTramo: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["desdeOrden", "hastaOrden", "importe"],
            properties: {
              desdeOrden: { bsonType: "int", minimum: 0 },
              hastaOrden: { bsonType: "int", minimum: 1 },
              importe: { bsonType: "decimal" }
            }
          }
        }
      }
    },
    colectivoSnapshot: {
      bsonType: "object",
      required: ["numeroInterno", "patente", "capacidad"],
      properties: {
        numeroInterno: { bsonType: "string" },
        patente: { bsonType: "string" },
        capacidad: { bsonType: "int", minimum: 1 }
      }
    },
    inventarioAsientos: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["numero", "ocupaciones"],
        properties: {
          numero: { bsonType: "int", minimum: 1 },
          ocupaciones: { bsonType: "array", items: ocupacion }
        }
      }
    },
    fechaCreacion: { bsonType: "date" }
  }
});

const tramoCompra = {
  bsonType: "object",
  required: ["origenTerminalId", "destinoTerminalId", "desdeOrden", "hastaOrden", "origen", "destino"],
  properties: {
    origenTerminalId: { bsonType: "objectId" },
    destinoTerminalId: { bsonType: "objectId" },
    desdeOrden: { bsonType: "int", minimum: 0 },
    hastaOrden: { bsonType: "int", minimum: 1 },
    origen: { bsonType: "string" },
    destino: { bsonType: "string" }
  }
};

aplicarColeccion("reservas", {
  bsonType: "object",
  title: "Bloqueo temporal de un asiento",
  required: ["codigo", "viajeId", "pasajeroId", "usuarioId", "asientoNumero", "tramo", "canal", "estado", "creadaEn", "venceEn"],
  properties: {
    _id: { bsonType: "objectId" },
    codigo: { bsonType: "string" },
    viajeId: { bsonType: "objectId" },
    pasajeroId: { bsonType: "objectId" },
    usuarioId: referenciaOpcional,
    asientoNumero: { bsonType: "int", minimum: 1 },
    tramo: tramoCompra,
    canal: { enum: ["online", "boleteria"] },
    estado: { enum: ["pendiente", "confirmada", "vencida", "cancelada"] },
    creadaEn: { bsonType: "date" },
    venceEn: { bsonType: "date" }
  }
});

aplicarColeccion("pasajes", {
  bsonType: "object",
  title: "Venta confirmada",
  required: ["codigo", "viajeId", "pasajeroId", "pasajeroSnapshot", "asientoNumero", "tramo", "viajeSnapshot", "venta", "pago", "estado", "embarque"],
  properties: {
    _id: { bsonType: "objectId" },
    codigo: { bsonType: "string" },
    reservaId: referenciaOpcional,
    viajeId: { bsonType: "objectId" },
    pasajeroId: { bsonType: "objectId" },
    pasajeroSnapshot: {
      bsonType: "object",
      required: ["tipoDocumento", "numeroDocumento", "nombre", "apellido"],
      properties: {
        tipoDocumento: { enum: ["DNI", "PASAPORTE", "CEDULA"] },
        numeroDocumento: { bsonType: "string" },
        nombre: { bsonType: "string" },
        apellido: { bsonType: "string" }
      }
    },
    compradorUsuarioId: referenciaOpcional,
    asientoNumero: { bsonType: "int", minimum: 1 },
    tramo: tramoCompra,
    viajeSnapshot: {
      bsonType: "object",
      required: ["codigo", "recorridoCodigo", "fechaSalida", "colectivoInterno"],
      properties: {
        codigo: { bsonType: "string" },
        recorridoCodigo: { bsonType: "string" },
        fechaSalida: { bsonType: "date" },
        colectivoInterno: { bsonType: "string" }
      }
    },
    venta: {
      bsonType: "object",
      required: ["canal", "fecha"],
      properties: {
        canal: { enum: ["online", "boleteria"] },
        fecha: { bsonType: "date" },
        vendedorUsuarioId: referenciaOpcional
      }
    },
    pago: {
      bsonType: "object",
      required: ["medio", "importe", "moneda", "estado", "codigoOperacion", "fecha"],
      properties: {
        medio: { enum: ["tarjeta", "efectivo", "transferencia", "billeteraVirtual"] },
        importe: { bsonType: "decimal" },
        moneda: { enum: ["ARS"] },
        estado: { enum: ["pendiente", "aprobado", "rechazado", "reintegrado"] },
        codigoOperacion: { bsonType: "string" },
        fecha: { bsonType: "date" }
      }
    },
    estado: { enum: ["confirmado", "cancelado", "utilizado"] },
    embarque: {
      bsonType: "object",
      required: ["estado", "fecha"],
      properties: {
        estado: { enum: ["pendiente", "embarcado", "ausente"] },
        fecha: fechaOpcional
      }
    }
  }
});

// Serie temporal: mediciones append-only del seguimiento operativo.
// Se separa de viajes porque cada vehículo puede generar muchas muestras por hora.
if (database.getCollectionInfos({ name: "seguimientoviajes" }).length === 0) {
  database.createCollection("seguimientoviajes", {
    timeseries: {
      timeField: "fecha",
      metaField: "meta",
      granularity: "minutes"
    }
  });
  print("Creada: seguimientoviajes (time series)");
} else {
  const informacion = database.getCollectionInfos({ name: "seguimientoviajes" })[0];
  if (informacion.type !== "timeseries") {
    throw new Error("seguimientoviajes existe, pero no es una colección time series.");
  }
  print("Conservada: seguimientoviajes (time series)");
}

// Identidad y códigos únicos.
database.usuarios.createIndex({ email: 1 }, { unique: true, name: "uq_usuarios_email" });
database.pasajeros.createIndex({ tipoDocumento: 1, numeroDocumento: 1 }, { unique: true, name: "uq_pasajeros_documento" });
database.terminales.createIndex({ codigo: 1 }, { unique: true, name: "uq_terminales_codigo" });
database.recorridos.createIndex({ codigo: 1 }, { unique: true, name: "uq_recorridos_codigo" });
database.colectivos.createIndex({ numeroInterno: 1 }, { unique: true, name: "uq_colectivos_numeroInterno" });
database.colectivos.createIndex({ patente: 1 }, { unique: true, name: "uq_colectivos_patente" });
database.viajes.createIndex({ codigo: 1 }, { unique: true, name: "uq_viajes_codigo" });
database.reservas.createIndex({ codigo: 1 }, { unique: true, name: "uq_reservas_codigo" });
database.pasajes.createIndex({ codigo: 1 }, { unique: true, name: "uq_pasajes_codigo" });

// Búsqueda, operación e informes.
database.terminales.createIndex({ ubicacion: "2dsphere" }, { name: "ix_terminales_ubicacion" });
database.recorridos.createIndex({ "paradas.terminalId": 1 }, { name: "ix_recorridos_terminales" });
database.viajes.createIndex({ fechaSalida: 1, estado: 1 }, { name: "ix_viajes_fecha_estado" });
database.viajes.createIndex({ "recorridoSnapshot.terminalesIds": 1, fechaSalida: 1 }, { name: "ix_viajes_terminales_fecha" });
database.viajes.createIndex(
  { "recorridoSnapshot.paresVenta": 1, estado: 1, fechaSalida: 1 },
  { name: "ix_viajes_parVenta_estado_fecha" }
);
database.viajes.createIndex({ colectivoId: 1, fechaSalida: 1 }, { name: "ix_viajes_colectivo_fecha" });
database.viajes.createIndex({ conductorId: 1, fechaSalida: 1 }, { name: "ix_viajes_conductor_fecha" });
database.reservas.createIndex({ viajeId: 1, estado: 1, venceEn: 1 }, { name: "ix_reservas_viaje_estado_vencimiento" });
database.reservas.createIndex({ pasajeroId: 1, creadaEn: -1 }, { name: "ix_reservas_pasajero_fecha" });
database.reservas.createIndex(
  { venceEn: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { estado: "pendiente" },
    name: "ttl_reservas_pendientes_venceEn"
  }
);
database.pasajes.createIndex({ viajeId: 1, estado: 1 }, { name: "ix_pasajes_viaje_estado" });
database.pasajes.createIndex({ pasajeroId: 1, "viajeSnapshot.fechaSalida": -1 }, { name: "ix_pasajes_pasajero_fecha" });
database.pasajes.createIndex(
  { "pasajeroSnapshot.tipoDocumento": 1, "pasajeroSnapshot.numeroDocumento": 1 },
  { name: "ix_pasajes_documento_pasajero" }
);
database.pasajes.createIndex(
  { compradorUsuarioId: 1, "viajeSnapshot.fechaSalida": -1 },
  { name: "ix_pasajes_comprador_fecha" }
);
database.pasajes.createIndex({ "venta.fecha": 1, "venta.canal": 1 }, { name: "ix_pasajes_venta_fecha_canal" });
database.pasajes.createIndex(
  { "viajeSnapshot.recorridoCodigo": 1, "venta.fecha": 1 },
  { name: "ix_pasajes_recorrido_venta_fecha" }
);
database.seguimientoviajes.createIndex(
  { "meta.viajeId": 1, fecha: 1 },
  { name: "ix_seguimiento_viaje_fecha" }
);

print("Estructura e índices de gestionpasajes listos.");
