import { useSyncExternalStore } from 'react'

// Tema claro/oscuro. Sin eleccion guardada sigue la preferencia del sistema
// (y sus cambios en vivo). El toggle guarda una eleccion explicita en
// localStorage: es una preferencia visual, no un dato sensible.
// index.html aplica la eleccion guardada antes del primer render (sin flash).

const CLAVE = 'lockergo.tema'
const consultaOscuro = window.matchMedia('(prefers-color-scheme: dark)')

function leerEleccion() {
  try {
    const valor = localStorage.getItem(CLAVE)
    return valor === 'claro' || valor === 'oscuro' ? valor : null
  } catch {
    return null
  }
}

let eleccion = leerEleccion()
const oyentes = new Set()

function temaEfectivo() {
  return eleccion ?? (consultaOscuro.matches ? 'oscuro' : 'claro')
}

function aplicar() {
  const raiz = document.documentElement
  if (eleccion) raiz.dataset.theme = eleccion === 'oscuro' ? 'dark' : 'light'
  else delete raiz.dataset.theme
  oyentes.forEach((oyente) => oyente())
}

consultaOscuro.addEventListener('change', aplicar)

export function alternarTema() {
  eleccion = temaEfectivo() === 'oscuro' ? 'claro' : 'oscuro'
  try {
    localStorage.setItem(CLAVE, eleccion)
  } catch {
    // sin almacenamiento: vale solo para esta carga
  }
  aplicar()
}

export function usarSistema() {
  eleccion = null
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada
  }
  aplicar()
}

function suscribir(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

/** Devuelve { tema: 'claro' | 'oscuro', sigueSistema: boolean } */
export function useTema() {
  const tema = useSyncExternalStore(suscribir, temaEfectivo)
  const sigueSistema = useSyncExternalStore(suscribir, () => eleccion === null)
  return { tema, sigueSistema }
}
