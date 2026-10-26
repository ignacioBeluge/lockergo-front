import { useSyncExternalStore } from 'react'

// Sesion del comprador: el token vive en memoria y se copia a sessionStorage
// para sobrevivir a una recarga de la pestana (no a cerrarla). Nunca se usa
// localStorage: el token dura 15 minutos y no tiene que quedar en disco.

const CLAVE = 'lockergo.sesion'
const CLAVE_ULTIMA_RESERVA = 'lockergo.ultimaReserva'

let sesion = null
let motivoCierre = null
let temporizador = null
const oyentes = new Set()

/** Lee los claims del JWT (sin validar la firma: eso lo hace cada servicio). */
function leerClaims(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function avisar() {
  oyentes.forEach((oyente) => oyente())
}

function programarVencimiento() {
  clearTimeout(temporizador)
  if (!sesion) return
  const restante = sesion.expiraEn - Date.now()
  // setTimeout no admite mas de ~24 dias; el token dura minutos.
  temporizador = setTimeout(() => cerrarSesion('vencida'), Math.max(restante, 0))
}

function armarSesion(token, usuario) {
  const claims = leerClaims(token)
  if (!claims?.exp) return null
  return {
    token,
    usuario,
    // sub = id del usuario; rol = COMPRADOR | TRANSPORTISTA (el tipo del registro)
    usuarioId: Number(claims.sub),
    rol: claims.rol,
    expiraEn: claims.exp * 1000,
  }
}

function restaurar() {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(CLAVE))
    if (!guardada) return
    const restaurada = armarSesion(guardada.token, guardada.usuario)
    if (restaurada && restaurada.expiraEn > Date.now()) {
      sesion = restaurada
      programarVencimiento()
    } else {
      sessionStorage.removeItem(CLAVE)
      sessionStorage.removeItem(CLAVE_ULTIMA_RESERVA)
      motivoCierre = 'vencida'
    }
  } catch {
    sessionStorage.removeItem(CLAVE)
    sessionStorage.removeItem(CLAVE_ULTIMA_RESERVA)
  }
}

restaurar()

export function obtenerSesion() {
  return sesion
}

/** Por que se cerro la ultima sesion: 'vencida', 'logout' o null. */
export function obtenerMotivoCierre() {
  return motivoCierre
}

/** Guarda la respuesta de POST /v1/sesiones. */
export function guardarSesion({ token, usuario }) {
  const nueva = armarSesion(token, usuario)
  if (!nueva) throw new Error('El token recibido no es valido.')
  sesion = nueva
  motivoCierre = null
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ token, usuario }))
  } catch {
    // sessionStorage no disponible: la sesion queda solo en memoria.
  }
  programarVencimiento()
  avisar()
}

export function cerrarSesion(motivo = 'logout') {
  if (!sesion) return
  sesion = null
  motivoCierre = motivo
  clearTimeout(temporizador)
  try {
    sessionStorage.removeItem(CLAVE)
    sessionStorage.removeItem(CLAVE_ULTIMA_RESERVA)
  } catch {
    // nada que borrar
  }
  avisar()
}

function suscribir(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export const AVISO_SESION_VENCIDA = 'Tu sesión venció, volvé a ingresar'

/** Ruta inicial segun el rol del token. */
export function rutaInicial(sesionActual) {
  if (!sesionActual) return '/login'
  return sesionActual.rol === 'TRANSPORTISTA' ? '/transportista' : '/lockers'
}

/** Hook: re-renderiza cuando se inicia o se cierra la sesion. */
export function useSesion() {
  return useSyncExternalStore(suscribir, obtenerSesion)
}

// Ultima reserva confirmada (id y codigo de retiro), para prellenar la
// pantalla de retiro aunque se navegue o se recargue. Se borra con el logout.

export function guardarUltimaReserva({ reservaId, codigoRetiro, horaResolucion }) {
  try {
    sessionStorage.setItem(CLAVE_ULTIMA_RESERVA, JSON.stringify({ reservaId, codigoRetiro, horaResolucion }))
  } catch {
    // sin sessionStorage no se prellena, no es grave
  }
}

export function leerUltimaReserva() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_ULTIMA_RESERVA))
  } catch {
    return null
  }
}
