import { useCallback, useEffect, useState } from 'react'

/**
 * Ejecuta una carga asincronica y expone { cargando, datos, error, recargar }.
 * `cargar` recibe un AbortSignal y tiene que ser estable (useCallback): se
 * vuelve a ejecutar cuando cambia. Si el componente se desmonta o la carga se
 * reemplaza, la anterior se cancela.
 *
 * "cargando" se deriva: es true mientras el ultimo resultado no corresponda
 * a la carga actual. Durante una recarga se siguen mostrando los datos previos.
 */
export function useCarga(cargar) {
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState({ cargar: null, version: -1, datos: null, error: null })

  useEffect(() => {
    const control = new AbortController()
    cargar(control.signal).then(
      (datos) => setResultado({ cargar, version, datos, error: null }),
      (error) => {
        if (error.name !== 'AbortError') setResultado({ cargar, version, datos: null, error })
      },
    )
    return () => control.abort()
  }, [cargar, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  const cargando = resultado.cargar !== cargar || resultado.version !== version
  return { cargando, datos: resultado.datos, error: cargando ? null : resultado.error, recargar }
}
