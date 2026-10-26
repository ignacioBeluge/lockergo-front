import { useSyncExternalStore } from 'react'

// Credenciales HTTP Basic del administrador de Lockers. Solo en memoria:
// se pierden al recargar la pagina y nunca se escriben en ningun storage.

let credenciales = null
const oyentes = new Set()

function avisar() {
  oyentes.forEach((oyente) => oyente())
}

export function guardarCredencialesAdmin(nuevas) {
  credenciales = nuevas
  avisar()
}

export function olvidarCredencialesAdmin() {
  credenciales = null
  avisar()
}

function suscribir(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function useCredencialesAdmin() {
  return useSyncExternalStore(suscribir, () => credenciales)
}
