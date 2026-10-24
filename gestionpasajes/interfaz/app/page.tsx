const viajes = [
  { hora: '21:00', llegada: '06:30', origen: 'Mendoza', destino: 'Córdoba', duracion: '9 h 30 min', servicio: 'Cama · Wi-Fi', disponibles: 39, precio: '$55.000' },
  { hora: '09:00', llegada: '18:30', origen: 'Mendoza', destino: 'Córdoba', duracion: '9 h 30 min', servicio: 'Semi cama · Wi-Fi', disponibles: 40, precio: '$55.000' },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">GP</span>
          <span><strong>Gestión Pasajes</strong><small>Empresa de larga distancia</small></span>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <p>OPERACIONES</p>
          <a className="active" href="#buscar"><span>⌕</span> Buscar viajes</a>
          <a href="#pasajes"><span>▣</span> Pasajes</a>
          <a href="#pasajeros"><span>◎</span> Pasajeros</a>
          <p>ANÁLISIS</p>
          <a href="#informes"><span>▥</span> Informes</a>
          <a href="#indices"><span>⌁</span> Datos e índices</a>
        </nav>

        <div className="db-card">
          <span className="status-dot" />
          <div><strong>MongoDB local</strong><small>gestionpasajes</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">OPERACIÓN DE VENTAS</span><h1>Buscar un viaje</h1></div>
          <div className="topbar-actions">
            <span className="demo-badge">Base académica · 2026</span>
            <button className="user-button" type="button" aria-label="Usuario de demostración">FM</button>
          </div>
        </header>

        <div className="content" id="buscar">
          <section className="search-panel" aria-label="Buscador de viajes">
            <div className="search-heading">
              <div><span className="eyebrow light">NUEVA CONSULTA</span><h2>¿A dónde viaja el pasajero?</h2></div>
              <span className="query-pill">usa paresVenta + índice compuesto</span>
            </div>

            <form className="search-grid">
              <label><span>Origen</span><select defaultValue="MDZ"><option value="MDZ">Mendoza · MDZ</option><option value="LUQ">San Luis · LUQ</option></select></label>
              <button className="swap-button" type="button" aria-label="Intercambiar origen y destino">⇄</button>
              <label><span>Destino</span><select defaultValue="COR"><option value="COR">Córdoba · COR</option><option value="VME">Villa Mercedes · VME</option></select></label>
              <label><span>Fecha de salida</span><input type="date" defaultValue="2026-11-15" /></label>
              <button className="primary-button" type="submit">Buscar viajes <span>→</span></button>
            </form>
          </section>

          <section className="stats-row" aria-label="Resumen de datos">
            <article><span>Viajes programados</span><strong>12</strong><small>6 recorridos activos</small></article>
            <article><span>Pasajes emitidos</span><strong>31</strong><small>Online y boletería</small></article>
            <article><span>Pasajeros</span><strong>15</strong><small>Con contacto registrado</small></article>
          </section>

          <section className="results-section">
            <div className="section-heading">
              <div><span className="eyebrow">RESULTADOS</span><h2>Mendoza → Córdoba</h2></div>
              <p><strong>3 viajes</strong> encontrados para el 15 nov.</p>
            </div>

            <div className="results-list">
              {viajes.map((viaje, index) => (
                <article className="trip-card" key={`${viaje.hora}-${index}`}>
                  <div className="trip-time"><strong>{viaje.hora}</strong><span>{viaje.origen}</span></div>
                  <div className="trip-route" aria-label={`${viaje.origen} a ${viaje.destino}`}><span className="route-dot" /><div><span>{viaje.duracion}</span></div><span className="route-dot destination" /></div>
                  <div className="trip-time arrival"><strong>{viaje.llegada}</strong><span>{viaje.destino}</span></div>
                  <div className="trip-service"><span>{viaje.servicio}</span><strong>{viaje.disponibles} asientos libres</strong></div>
                  <div className="trip-price"><small>Precio por persona</small><strong>{viaje.precio}</strong></div>
                  <button className="secondary-button" type="button">Ver asientos</button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
