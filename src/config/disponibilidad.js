import { TAMANOS } from './tarifas.js'

/**
 * Resume los compartimentos de un locker por tamano: { CHICO: { total, libres }, ... }.
 * "Libres" son los DISPONIBLE, igual que cuenta GET /v1/lockers/{id}/disponibilidad.
 * Ojo: Reservas no marca el compartimento al crear un hold, asi que uno con
 * hold activo sigue figurando DISPONIBLE (el POST responde 409).
 */
export function resumirPorTamano(compartimentos) {
  const resumen = Object.fromEntries(TAMANOS.map((t) => [t, { total: 0, libres: 0 }]))
  for (const c of compartimentos) {
    const fila = resumen[c.tamano]
    if (!fila) continue
    fila.total++
    if (c.estado === 'DISPONIBLE') fila.libres++
  }
  return resumen
}

/** Compartimentos DISPONIBLE de un tamano, en orden de id. */
export function libresDeTamano(compartimentos, tamano) {
  return compartimentos.filter((c) => c.tamano === tamano && c.estado === 'DISPONIBLE').sort((a, b) => a.id - b.id)
}
