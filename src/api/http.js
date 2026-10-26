import { cerrarSesion, obtenerSesion } from '../sesion/sesion.js'

// Nombres para los mensajes de error ("El servicio de reservas no responde").
const NOMBRES = {
  usuarios: 'usuarios',
  lockers: 'lockers',
  reservas: 'reservas',
  pagos: 'pagos',
  notificaciones: 'notificaciones',
  operaciones: 'operaciones',
}

/**
 * Error de la API con un mensaje listo para mostrar. Si el backend respondio
 * Problem Details (RFC 9457), conserva title, detail y, en los 400, los
 * errores campo por campo.
 */
export class ApiError extends Error {
  constructor({ status, titulo, detalle, errores = {}, retryAfter = null }) {
    super(detalle && titulo ? `${titulo}: ${detalle}` : detalle || titulo)
    this.name = 'ApiError'
    this.status = status
    this.titulo = titulo
    this.detalle = detalle
    this.errores = errores
    this.retryAfter = retryAfter
  }
}

function esProblemDetails(contentType) {
  return contentType.includes('application/problem+json') || contentType.includes('application/json')
}

async function leerCuerpo(respuesta) {
  const contentType = respuesta.headers.get('content-type') ?? ''
  const texto = await respuesta.text()
  if (!texto || !esProblemDetails(contentType)) return null
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

function errorDesde(respuesta, cuerpo, servicio) {
  const status = respuesta.status
  if (cuerpo && (cuerpo.title || cuerpo.detail)) {
    const retryAfter = respuesta.headers.get('retry-after')
    return new ApiError({
      status,
      titulo: cuerpo.title,
      detalle: cuerpo.detail,
      errores: cuerpo.errores ?? {},
      retryAfter: retryAfter ? Number(retryAfter) : null,
    })
  }
  // Sin Problem Details: lo mas probable es que el proxy de Vite no haya
  // llegado al servicio (no esta levantado).
  if (status >= 500) {
    return new ApiError({
      status,
      titulo: 'Servicio no disponible',
      detalle: `El servicio de ${NOMBRES[servicio]} no responde. ¿Está levantado el backend (demo-up.ps1)?`,
    })
  }
  return new ApiError({ status, titulo: `Error ${status}`, detalle: 'La respuesta del servidor no es válida.' })
}

/**
 * Hace una llamada a un servicio a traves del proxy de Vite (/api/<servicio>).
 *
 * auth: 'jwt' agrega el token de la sesion; 'basic' usa las credenciales que
 * se pasen en `basic`; 'ninguna' no agrega nada. Un 401 con JWT cierra la
 * sesion (el guard de rutas redirige al login con el aviso).
 *
 * Devuelve { status, datos, headers } para que quien llama pueda distinguir,
 * por ejemplo, un 201 de un 202.
 */
export async function solicitar(servicio, ruta, { metodo = 'GET', cuerpo, auth = 'jwt', basic, headers = {}, signal } = {}) {
  const encabezados = { Accept: 'application/json, application/problem+json', ...headers }
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json'

  if (auth === 'jwt') {
    const sesion = obtenerSesion()
    if (sesion) encabezados.Authorization = `Bearer ${sesion.token}`
  } else if (auth === 'basic' && basic) {
    encabezados.Authorization = `Basic ${btoa(`${basic.usuario}:${basic.password}`)}`
  }

  let respuesta
  try {
    respuesta = await fetch(`/api/${servicio}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError({
      status: 0,
      titulo: 'Sin conexión',
      detalle: 'No se pudo conectar con el servidor de desarrollo. ¿Está corriendo npm run dev?',
    })
  }

  const datos = await leerCuerpo(respuesta)
  if (!respuesta.ok) {
    if (respuesta.status === 401 && auth === 'jwt') cerrarSesion('vencida')
    throw errorDesde(respuesta, datos, servicio)
  }
  return { status: respuesta.status, datos, headers: respuesta.headers }
}

/** Atajo para cuando solo interesa el cuerpo de la respuesta. */
export async function pedir(servicio, ruta, opciones) {
  const { datos } = await solicitar(servicio, ruta, opciones)
  return datos
}

/** Arma un query string ignorando los valores vacios. */
export function query(parametros) {
  const qs = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') qs.set(clave, valor)
  }
  const texto = qs.toString()
  return texto ? `?${texto}` : ''
}
