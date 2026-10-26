import { useEffect, useState } from 'react'

/**
 * Milisegundos que faltan para `objetivoMs` (hora del servidor), o null si no
 * hay objetivo. `desfaseMs` es reloj del navegador menos reloj del servidor.
 * Se actualiza 4 veces por segundo y deja de hacerlo al llegar a 0.
 */
export function useCuentaRegresiva(objetivoMs, desfaseMs = 0) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (objetivoMs == null) return undefined
    const intervalo = setInterval(() => {
      const actual = Date.now()
      setAhora(actual)
      if (objetivoMs - (actual - desfaseMs) <= 0) clearInterval(intervalo)
    }, 250)
    return () => clearInterval(intervalo)
  }, [objetivoMs, desfaseMs])

  if (objetivoMs == null) return null
  return Math.max(0, objetivoMs - (ahora - desfaseMs))
}

export function formatearMinutos(ms) {
  const segundos = Math.ceil(ms / 1000)
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0')
  const ss = String(segundos % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
