// Datos que carga el boton "Cargar datos de demo" del panel de administrador.
// Lockers arranca vacio (H2 en memoria): sin esto no hay nada para reservar.

export const LOCKERS_DEMO = [
  {
    nombre: 'Locker Obelisco',
    direccion: 'Av. Corrientes 1050, CABA',
    zona: 'Centro',
    compartimentos: { CHICO: 3, MEDIANO: 2, GRANDE: 1 },
  },
  {
    nombre: 'Locker Palermo Soho',
    direccion: 'Honduras 4800, CABA',
    zona: 'Palermo',
    compartimentos: { CHICO: 2, MEDIANO: 2, GRANDE: 2 },
  },
  {
    nombre: 'Locker UADE Monserrat',
    direccion: 'Lima 775, CABA',
    zona: 'Monserrat',
    compartimentos: { CHICO: 2, MEDIANO: 1, GRANDE: 1 },
  },
]
