import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AVISO_SESION_VENCIDA, obtenerMotivoCierre, rutaInicial, useSesion } from '../sesion/sesion.js'

/**
 * Exige una sesion con el rol indicado. Sin sesion redirige al login (con el
 * aviso de sesion vencida si se cerro por un 401 o por vencimiento); con
 * otro rol, a su pantalla inicial.
 */
export function RequiereRol({ rol }) {
  const sesion = useSesion()
  const location = useLocation()
  if (!sesion) {
    const aviso = obtenerMotivoCierre() === 'vencida' ? AVISO_SESION_VENCIDA : null
    return <Navigate to="/login" replace state={{ aviso, desde: location.pathname }} />
  }
  if (sesion.rol !== rol) return <Navigate to={rutaInicial(sesion)} replace />
  return <Outlet />
}

export function Inicio() {
  const sesion = useSesion()
  return <Navigate to={rutaInicial(sesion)} replace />
}
