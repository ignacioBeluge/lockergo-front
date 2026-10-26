// Piezas de interfaz compartidas: avisos, estados de carga y campos de formulario.

export function Alerta({ tipo = 'info', titulo, children, role }) {
  return (
    <div className={`alerta alerta-${tipo}`} role={role ?? (tipo === 'error' ? 'alert' : 'status')}>
      {titulo && <strong className="alerta-titulo">{titulo}</strong>}
      {children && <div>{children}</div>}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  )
}

/** Error de una carga, con el mensaje legible de la API y un boton para reintentar. */
export function ErrorCarga({ error, onReintentar, titulo = 'No se pudo cargar' }) {
  return (
    <Alerta tipo="error" titulo={titulo}>
      <p>{error?.message ?? 'Error desconocido.'}</p>
      {onReintentar && (
        <button type="button" className="boton boton-secundario boton-chico" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </Alerta>
  )
}

/** Error de un envio de formulario (ApiError o validacion local). */
export function ErrorEnvio({ error }) {
  if (!error) return null
  return (
    <Alerta tipo="error" titulo={error.titulo ?? 'No se pudo completar la operación'}>
      <p>{error.detalle ?? error.message}</p>
    </Alerta>
  )
}

export function Campo({ id, etiqueta, error, ayuda, children, ...props }) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  const idError = error ? `${id}-error` : undefined
  const describedBy = [idAyuda, idError].filter(Boolean).join(' ') || undefined
  return (
    <div className={`campo${error ? ' campo-con-error' : ''}`}>
      <label htmlFor={id}>{etiqueta}</label>
      {children ?? <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />}
      {ayuda && (
        <small id={idAyuda} className="campo-ayuda">
          {ayuda}
        </small>
      )}
      {error && (
        <small id={idError} className="campo-error">
          {error}
        </small>
      )}
    </div>
  )
}

const ETIQUETAS_ESTADO = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  OCUPADO: 'Ocupado',
  ACTIVA: 'Activa',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
  PENDIENTE_VALIDACION: 'Validando',
  COMPLETADO: 'Completado',
  RECHAZADO: 'Rechazado',
  FALLIDO: 'Fallido',
}

const TONOS_ESTADO = {
  DISPONIBLE: 'exito',
  CONFIRMADA: 'exito',
  COMPLETADO: 'exito',
  ACTIVA: 'info',
  PENDIENTE_VALIDACION: 'info',
  RESERVADO: 'aviso',
  OCUPADO: 'neutro',
  CANCELADA: 'neutro',
  EXPIRADA: 'error',
  RECHAZADO: 'error',
  FALLIDO: 'error',
}

export function Estado({ valor }) {
  return <span className={`insignia insignia-${TONOS_ESTADO[valor] ?? 'neutro'}`}>{ETIQUETAS_ESTADO[valor] ?? valor}</span>
}
