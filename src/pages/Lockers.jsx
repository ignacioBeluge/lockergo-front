import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarCompartimentos, listarLockers } from '../api/lockers.js'
import { Campo, Cargando, ErrorCarga } from '../components/ui.jsx'
import { resumirPorTamano } from '../config/disponibilidad.js'
import { TAMANOS } from '../config/tarifas.js'
import { useCarga } from '../hooks/useCarga.js'

function TarjetaLocker({ locker }) {
  const cargar = useCallback((signal) => listarCompartimentos(locker.id, { signal }), [locker.id])
  const { cargando, datos: compartimentos, error, recargar } = useCarga(cargar)

  const resumen = compartimentos ? resumirPorTamano(compartimentos) : null
  const primerLibre = resumen && TAMANOS.find((t) => resumen[t].libres > 0)

  return (
    <article className="tarjeta">
      <div className="tarjeta-encabezado">
        <div>
          <h2>{locker.nombre}</h2>
          <p className="locker-direccion">{locker.direccion}</p>
        </div>
        <span className="insignia insignia-neutro">{locker.zona}</span>
      </div>

      {cargando && !compartimentos ? (
        <Cargando texto="Cargando compartimentos…" />
      ) : error ? (
        <ErrorCarga error={error} onReintentar={recargar} titulo="No se pudieron cargar los compartimentos" />
      ) : compartimentos.length === 0 ? (
        <p className="vacio">Este locker todavía no tiene compartimentos.</p>
      ) : (
        <>
          <div className="tamanos" aria-label="Disponibilidad por tamaño">
            {TAMANOS.map((t) => (
              <div key={t} className={`tamano ${resumen[t].libres > 0 ? 'tamano-libre' : 'tamano-agotado'}`}>
                <div className="tamano-nombre">{t}</div>
                <div className="tamano-cantidad">{resumen[t].libres}</div>
                <small className="texto-suave">de {resumen[t].total} libres</small>
              </div>
            ))}
          </div>
          <details className="detalle">
            <summary>Ver los {compartimentos.length} compartimentos</summary>
            <ul className="compartimentos">
              {compartimentos.map((c) => (
                <li key={c.id} className={`compartimento compartimento-${c.estado}`} title={c.estado}>
                  #{c.id} · {c.tamano.toLowerCase()} · {c.estado.toLowerCase()}
                </li>
              ))}
            </ul>
          </details>
          <div className="acciones">
            {primerLibre ? (
              <Link className="boton boton-primario" to={`/lockers/${locker.id}/reservar?tamano=${primerLibre}`}>
                Reservar en este locker
              </Link>
            ) : (
              <button type="button" className="boton boton-secundario" disabled>
                Sin compartimentos libres
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}

export default function Lockers() {
  const [parametros, setParametros] = useSearchParams()
  const zona = parametros.get('zona') ?? ''
  const pagina = Number(parametros.get('pagina') ?? 1)

  // Las zonas salen de todos los lockers: el backend filtra por zona exacta
  // y no tiene un endpoint que las liste.
  const cargarZonas = useCallback(
    (signal) => listarLockers({ tamanio: 100, orden: 'zona' }, { signal }).then((r) => [...new Set(r.datos.map((l) => l.zona))]),
    [],
  )
  const zonas = useCarga(cargarZonas)

  const cargarLockers = useCallback(
    (signal) => listarLockers({ zona, pagina, tamanio: 12, orden: 'nombre' }, { signal }),
    [zona, pagina],
  )
  const { cargando, datos, error, recargar } = useCarga(cargarLockers)

  function cambiarFiltro(nuevaZona) {
    setParametros(nuevaZona ? { zona: nuevaZona } : {})
  }

  function irAPagina(numero) {
    setParametros({ ...(zona ? { zona } : {}), pagina: String(numero) })
  }

  const lockers = datos?.datos ?? []
  const info = datos?.pagina

  return (
    <>
      <div className="pagina-encabezado">
        <div>
          <h1>Buscar lockers</h1>
          <p>Elegí un locker con compartimentos libres del tamaño que necesitás.</p>
        </div>
      </div>

      <div className="filtros">
        <Campo id="filtro-zona" etiqueta="Zona">
          <select id="filtro-zona" value={zona} onChange={(e) => cambiarFiltro(e.target.value)} disabled={zonas.cargando}>
            <option value="">Todas las zonas</option>
            {(zonas.datos ?? []).map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </Campo>
        <button type="button" className="boton boton-secundario" onClick={recargar} disabled={cargando}>
          Actualizar
        </button>
      </div>
      {zonas.error && <ErrorCarga error={zonas.error} onReintentar={zonas.recargar} titulo="No se pudieron cargar las zonas" />}

      {cargando && !datos ? (
        <Cargando texto="Buscando lockers…" />
      ) : error ? (
        <ErrorCarga error={error} onReintentar={recargar} />
      ) : lockers.length === 0 ? (
        <div className="tarjeta vacio">
          <h2>No hay lockers {zona ? `en ${zona}` : 'cargados'}</h2>
          <p>
            Si es la primera vez que levantás el backend, cargá los datos de demo desde{' '}
            <Link to="/admin">Administración</Link>.
          </p>
        </div>
      ) : (
        <>
          <div className="grilla">
            {lockers.map((locker) => (
              <TarjetaLocker key={locker.id} locker={locker} />
            ))}
          </div>
          {info && info.totalPaginas > 1 && (
            <nav className="acciones" aria-label="Paginación">
              <button
                type="button"
                className="boton boton-secundario"
                disabled={info.numero <= 1}
                onClick={() => irAPagina(info.numero - 1)}
              >
                Anterior
              </button>
              <span className="texto-suave paginacion-texto">
                Página {info.numero} de {info.totalPaginas}
              </span>
              <button
                type="button"
                className="boton boton-secundario"
                disabled={info.numero >= info.totalPaginas}
                onClick={() => irAPagina(info.numero + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </>
  )
}
