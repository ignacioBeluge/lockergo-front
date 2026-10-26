import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cerrarSesion, useSesion } from '../sesion/sesion.js'
import { alternarTema, useTema } from '../tema/tema.js'

function BotonTema() {
  const { tema, sigueSistema } = useTema()
  const siguiente = tema === 'oscuro' ? 'claro' : 'oscuro'
  return (
    <button
      type="button"
      className="boton-icono"
      onClick={alternarTema}
      aria-label={`Cambiar a tema ${siguiente}`}
      title={`Tema ${tema}${sigueSistema ? ' (del sistema)' : ''}. Cambiar a ${siguiente}`}
    >
      <span aria-hidden="true">{tema === 'oscuro' ? '☾' : '☀'}</span>
    </button>
  )
}

export default function Layout() {
  const sesion = useSesion()
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  // Al navegar se cierra el menu movil (se compara contra la ruta en la que se abrio).
  const [rutaDelMenu, setRutaDelMenu] = useState(location.pathname)
  if (rutaDelMenu !== location.pathname) {
    setRutaDelMenu(location.pathname)
    setMenuAbierto(false)
  }

  const esComprador = sesion?.rol === 'COMPRADOR'

  return (
    <div className="app">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="cabecera">
        <div className="cabecera-interior">
          <NavLink to="/" className="marca">
            <span className="marca-logo" aria-hidden="true">
              ▣
            </span>
            LockerGo
          </NavLink>

          <button
            type="button"
            className="boton-icono menu-boton"
            aria-expanded={menuAbierto}
            aria-controls="navegacion"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <span aria-hidden="true">{menuAbierto ? '✕' : '☰'}</span>
            <span className="solo-lectores">Menú</span>
          </button>

          <nav id="navegacion" className={`navegacion${menuAbierto ? ' abierta' : ''}`} aria-label="Principal">
            {esComprador && (
              <>
                <NavLink to="/lockers">Buscar lockers</NavLink>
                <NavLink to="/retiro">Retirar paquete</NavLink>
              </>
            )}
            {sesion?.rol === 'TRANSPORTISTA' && <NavLink to="/transportista">Depósitos</NavLink>}
            <NavLink to="/admin">Administración</NavLink>
            <div className="navegacion-usuario">
              {sesion ? (
                <>
                  <span className="usuario-nombre" title={sesion.usuario?.email}>
                    {sesion.usuario?.nombre}
                  </span>
                  <button type="button" className="boton boton-fantasma boton-chico" onClick={() => cerrarSesion()}>
                    Salir
                  </button>
                </>
              ) : (
                <NavLink to="/login">Ingresar</NavLink>
              )}
              <BotonTema />
            </div>
          </nav>
        </div>
      </header>

      <main id="contenido" className="contenido">
        <Outlet />
      </main>

      <footer className="pie">LockerGo · Desarrollo de Aplicaciones II · UADE</footer>
    </div>
  )
}
