const estado = { terminales: [], viajes: [], viajeSeleccionado: null, asientoSeleccionado: null, cargados: new Set() };

const $ = (selector, contexto = document) => contexto.querySelector(selector);
const $$ = (selector, contexto = document) => [...contexto.querySelectorAll(selector)];
const escapar = (valor) => String(valor ?? '').replace(/[&<>'"]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter]);

async function api(ruta, opciones) {
  const respuesta = await fetch(ruta, opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo completar la operación.');
  return datos;
}

function moneda(importe) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(importe);
}

function fechaHora(fecha) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Mendoza' }).format(new Date(fecha));
}

function hora(fecha) {
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Mendoza' }).format(new Date(fecha));
}

function duracion(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas} h${resto ? ` ${resto} min` : ''}`;
}

function avisar(mensaje, esError = false) {
  const toast = $('#toast');
  toast.textContent = mensaje;
  toast.className = `toast visible${esError ? ' error' : ''}`;
  clearTimeout(avisar.temporizador);
  avisar.temporizador = setTimeout(() => { toast.className = 'toast'; }, 3600);
}

function opcionesTerminales(textoInicial) {
  return `<option value="" selected disabled>${escapar(textoInicial)}</option>` + estado.terminales.map(terminal => `<option value="${escapar(terminal.codigo)}">${escapar(terminal.ciudad)} · ${escapar(terminal.codigo)}</option>`).join('');
}

async function iniciar() {
  try {
    const datos = await api('/api/bootstrap');
    estado.terminales = datos.terminales;
    $('#db-status').textContent = 'MongoDB conectado';
    $('#db-name').textContent = datos.base;
    $('#stat-viajes').textContent = datos.conteos.viajes;
    $('#stat-pasajes').textContent = datos.conteos.pasajes;
    $('#stat-pasajeros').textContent = datos.conteos.pasajeros;
    $('#stat-recorridos').textContent = datos.conteos.recorridos;
    $('#origen').innerHTML = opcionesTerminales('Seleccionar origen');
    $('#destino').innerHTML = opcionesTerminales('Seleccionar destino');
    if (datos.fechaSugerida) $('#fecha').value = datos.fechaSugerida;
  } catch (error) {
    $('#db-status').textContent = 'MongoDB sin conexión';
    $('#db-status-dot').classList.add('offline');
    avisar(error.message, true);
  }
}

async function buscarViajes(evento) {
  if (evento) evento.preventDefault();
  const origen = $('#origen').value;
  const destino = $('#destino').value;
  const fecha = $('#fecha').value;
  if (!origen || !destino) return avisar('Seleccioná un origen y un destino.', true);
  if (origen === destino) return avisar('El origen y el destino deben ser diferentes.', true);
  $('#home-promos').hidden = true;
  $('#search-results').hidden = false;
  $('#viajes-list').innerHTML = '<div class="loading-state">Consultando viajes e inventarios…</div>';
  try {
    estado.viajes = await api(`/api/viajes?origen=${encodeURIComponent(origen)}&destino=${encodeURIComponent(destino)}&fecha=${encodeURIComponent(fecha)}`);
    const origenTexto = estado.terminales.find(t => t.codigo === origen)?.ciudad || origen;
    const destinoTexto = estado.terminales.find(t => t.codigo === destino)?.ciudad || destino;
    $('#route-title').textContent = `${origenTexto} → ${destinoTexto}`;
    $('#results-summary').innerHTML = `<strong>${estado.viajes.length} ${estado.viajes.length === 1 ? 'viaje' : 'viajes'}</strong> encontrados para la fecha elegida.`;
    renderizarViajes();
  } catch (error) {
    $('#viajes-list').innerHTML = `<div class="empty-state error-state">${escapar(error.message)}</div>`;
  }
}

function renderizarViajes() {
  if (!estado.viajes.length) {
    $('#viajes-list').innerHTML = '<div class="empty-state"><strong>No hay viajes para esta combinación.</strong><span>Probá con otra fecha o un destino posterior dentro del recorrido.</span></div>';
    return;
  }
  $('#viajes-list').innerHTML = estado.viajes.map(viaje => `
    <article class="trip-card">
      <div class="trip-time"><strong>${hora(viaje.salida)}</strong><span>${escapar(viaje.origen)}</span></div>
      <div class="trip-route"><span class="route-dot"></span><div><span>${duracion(viaje.duracionMinutos)}</span></div><span class="route-dot destination"></span></div>
      <div class="trip-time arrival"><strong>${hora(viaje.llegada)}</strong><span>${escapar(viaje.destino)}</span></div>
      <div class="trip-service"><span>${escapar((viaje.servicios || []).slice(0, 2).join(' · ') || viaje.colectivo)}</span><strong>${viaje.disponibles} asientos libres</strong></div>
      <div class="trip-price"><small>Precio por persona</small><strong>${moneda(viaje.importe)}</strong></div>
      <button class="secondary-button" type="button" data-seat-trip="${viaje.id}">Ver asientos</button>
    </article>`).join('');
}

async function abrirAsientos(viajeId) {
  const viaje = estado.viajes.find(item => item.id === viajeId);
  if (!viaje) return;
  estado.viajeSeleccionado = viaje;
  estado.asientoSeleccionado = null;
  $('#selected-seat').textContent = 'Elegí un asiento';
  $('#reserve-form button').disabled = true;
  $('#reserve-message').textContent = '';
  $('#seat-title').textContent = `${viaje.origen} → ${viaje.destino}`;
  $('#seat-subtitle').textContent = `${viaje.codigo} · ${fechaHora(viaje.salida)} · ${viaje.colectivo}`;
  $('#seat-grid').innerHTML = '<div class="loading-state">Leyendo inventario por tramo…</div>';
  if (!$('#seat-dialog').open) $('#seat-dialog').showModal();
  try {
    const datos = await api(`/api/viajes/${viaje.id}/asientos?origen=${viaje.origenCodigo}&destino=${viaje.destinoCodigo}`);
    renderizarAsientos(datos.asientos);
  } catch (error) {
    $('#seat-grid').innerHTML = `<div class="empty-state error-state">${escapar(error.message)}</div>`;
  }
}

function renderizarAsientos(asientos) {
  const pisos = [...new Set(asientos.map(asiento => asiento.piso))];
  $('#seat-grid').innerHTML = pisos.map(piso => `
    <section class="floor"><h4>Piso ${piso}</h4><div class="floor-grid">${asientos.filter(asiento => asiento.piso === piso).map(asiento => `
      <button type="button" class="seat ${asiento.disponible ? 'available' : 'occupied'}" data-seat="${asiento.numero}" ${asiento.disponible ? '' : 'disabled'} aria-label="Asiento ${asiento.numero}, ${asiento.disponible ? 'disponible' : 'ocupado'}">
        <strong>${asiento.numero}</strong><small>${asiento.ubicacion === 'ventana' ? 'V' : 'P'}</small>
      </button>`).join('')}</div></section>`).join('');
}

async function reservar(evento) {
  evento.preventDefault();
  if (!estado.viajeSeleccionado || !estado.asientoSeleccionado) return;
  const boton = $('#reserve-form button');
  boton.disabled = true;
  boton.textContent = 'Reservando…';
  try {
    const reserva = await api('/api/reservas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viajeId: estado.viajeSeleccionado.id,
        dni: $('#reserve-dni').value.trim(),
        asientoNumero: estado.asientoSeleccionado,
        origen: estado.viajeSeleccionado.origenCodigo,
        destino: estado.viajeSeleccionado.destinoCodigo
      })
    });
    $('#reserve-message').innerHTML = `<strong>${escapar(reserva.codigo)}</strong><span>${escapar(reserva.pasajero)} · asiento ${reserva.asientoNumero}</span><small>Vence ${fechaHora(reserva.venceEn)}</small>`;
    avisar('Reserva creada y asiento bloqueado correctamente.');
    await abrirAsientos(estado.viajeSeleccionado.id);
    await buscarViajes();
  } catch (error) {
    $('#reserve-message').textContent = error.message;
    avisar(error.message, true);
  } finally {
    boton.textContent = 'Reservar por 10 minutos';
    boton.disabled = !estado.asientoSeleccionado;
  }
}

async function buscarPasajes(evento) {
  evento.preventDefault();
  const contenedor = $('#ticket-results');
  contenedor.innerHTML = '<div class="loading-state">Buscando por snapshot de documento…</div>';
  try {
    const pasajes = await api(`/api/pasajes?dni=${encodeURIComponent($('#ticket-dni').value.trim())}`);
    if (!pasajes.length) return contenedor.innerHTML = '<div class="empty-state">No se encontraron pasajes para ese documento.</div>';
    contenedor.innerHTML = `<div class="ticket-list">${pasajes.map(pasaje => `
      <article class="ticket-row"><span class="ticket-code">${escapar(pasaje.codigo)}</span><div><strong>${escapar(pasaje.pasajeroSnapshot.nombre)} ${escapar(pasaje.pasajeroSnapshot.apellido)}</strong><small>${escapar(pasaje.tramo.origen)} → ${escapar(pasaje.tramo.destino)}</small></div><div><strong>${fechaHora(pasaje.viajeSnapshot.fechaSalida)}</strong><small>Asiento ${pasaje.asientoNumero} · ${escapar(pasaje.venta.canal)}</small></div><div class="ticket-amount"><strong>${moneda(pasaje.pago.importe)}</strong><span class="status-tag">${escapar(pasaje.estado)}</span></div></article>`).join('')}</div>`;
  } catch (error) {
    contenedor.innerHTML = `<div class="empty-state error-state">${escapar(error.message)}</div>`;
  }
}

async function cargarPasajeros() {
  const pasajeros = await api('/api/pasajeros');
  $('#passenger-count').textContent = `${pasajeros.length} pasajeros`;
  $('#passengers-body').innerHTML = pasajeros.map(pasajero => `<tr><td><strong>${escapar(pasajero.apellido)}, ${escapar(pasajero.nombre)}</strong></td><td>${escapar(pasajero.tipoDocumento)} ${escapar(pasajero.numeroDocumento)}</td><td>${escapar(pasajero.contacto?.email || '—')}</td><td>${escapar(pasajero.contacto?.telefono || '—')}</td><td><span class="status-tag">${escapar(pasajero.estado)}</span></td></tr>`).join('');
}

async function cargarInformes() {
  const datos = await api('/api/informes');
  const maximo = Math.max(...datos.porRecorrido.map(item => item.recaudacion), 1);
  $('#route-report').innerHTML = datos.porRecorrido.map(item => `<div class="bar-row"><div><strong>${escapar(item._id)}</strong><span>${item.cantidad} pasajes · ${moneda(item.recaudacion)}</span></div><div class="bar-track"><i style="width:${Math.max(5, item.recaudacion / maximo * 100)}%"></i></div></div>`).join('');
  $('#channel-report').innerHTML = datos.porCanal.map(item => `<article><span>${escapar(item._id)}</span><strong>${moneda(item.recaudacion)}</strong><small>${item.cantidad} pasajes emitidos</small></article>`).join('');
}

async function cargarIndices() {
  const colecciones = await api('/api/indices');
  $('#index-grid').innerHTML = colecciones.map(grupo => `<article class="index-card"><header><span>${escapar(grupo.coleccion)}</span><strong>${grupo.indices.length}</strong></header><div>${grupo.indices.map(indice => `<p><strong>${escapar(indice.nombre)}</strong><code>${escapar(JSON.stringify(indice.campos))}</code>${indice.unico ? '<span>único</span>' : ''}${indice.ttl !== null ? '<span>TTL</span>' : ''}</p>`).join('')}</div></article>`).join('');
}

async function cambiarPantalla(nombre) {
  $$('.screen').forEach(pantalla => { pantalla.hidden = pantalla.dataset.screen !== nombre; pantalla.classList.toggle('active', pantalla.dataset.screen === nombre); });
  $$('[data-screen-link]').forEach(enlace => enlace.classList.toggle('active', enlace.dataset.screenLink === nombre));
  const titulos = { buscar: ['OPERACIÓN DE VENTAS', 'Buscar un viaje'], pasajes: ['VENTAS CONFIRMADAS', 'Consulta de pasajes'], pasajeros: ['PERSONAS QUE VIAJAN', 'Pasajeros'], informes: ['INTELIGENCIA OPERATIVA', 'Informes'], indices: ['RENDIMIENTO', 'Datos e índices'] };
  $('.topbar .eyebrow').textContent = titulos[nombre][0];
  $('.topbar h1').textContent = titulos[nombre][1];
  if (!estado.cargados.has(nombre)) {
    estado.cargados.add(nombre);
    try {
      if (nombre === 'pasajeros') await cargarPasajeros();
      if (nombre === 'informes') await cargarInformes();
      if (nombre === 'indices') await cargarIndices();
    } catch (error) { avisar(error.message, true); }
  }
}

$('#search-form').addEventListener('submit', buscarViajes);
$('#swap-route').addEventListener('click', () => { const origen = $('#origen').value; $('#origen').value = $('#destino').value; $('#destino').value = origen; });
$('#viajes-list').addEventListener('click', evento => { const boton = evento.target.closest('[data-seat-trip]'); if (boton) abrirAsientos(boton.dataset.seatTrip); });
$('#home-promos').addEventListener('click', evento => {
  const boton = evento.target.closest('[data-promo-origin]');
  if (!boton) return;
  $('#origen').value = boton.dataset.promoOrigin;
  $('#destino').value = boton.dataset.promoDestination;
  if (boton.dataset.promoDate) $('#fecha').value = boton.dataset.promoDate;
  buscarViajes();
});
$('#seat-grid').addEventListener('click', evento => {
  const asiento = evento.target.closest('[data-seat]:not(:disabled)');
  if (!asiento) return;
  $$('.seat.selected').forEach(item => item.classList.remove('selected'));
  asiento.classList.add('selected');
  estado.asientoSeleccionado = Number(asiento.dataset.seat);
  $('#selected-seat').textContent = `Asiento ${estado.asientoSeleccionado}`;
  $('#reserve-form button').disabled = false;
});
$('#close-seats').addEventListener('click', () => $('#seat-dialog').close());
$('#seat-dialog').addEventListener('click', evento => { if (evento.target === $('#seat-dialog')) $('#seat-dialog').close(); });
$('#reserve-form').addEventListener('submit', reservar);
$('#ticket-search-form').addEventListener('submit', buscarPasajes);
$$('[data-screen-link]').forEach(enlace => enlace.addEventListener('click', evento => { evento.preventDefault(); cambiarPantalla(enlace.dataset.screenLink); }));

iniciar();
