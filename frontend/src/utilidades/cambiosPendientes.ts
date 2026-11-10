// ─────────────────────────────────────────────────────────────
// Cambios sin guardar
//
// Un formulario largo (como la entrada del diario) avisa aquí si tiene cambios sin guardar.
// Antes de cambiar de día, de sección o de cerrar la pestaña se pide confirmación.
// ─────────────────────────────────────────────────────────────

let hayPendientes = false

// Cerrar o recargar la pestaña: el navegador muestra su propio aviso
function alSalirDeLaPagina(e: BeforeUnloadEvent) {
  e.preventDefault()
}

export function marcarCambiosPendientes(pendientes: boolean) {
  if (pendientes === hayPendientes) return
  hayPendientes = pendientes
  if (pendientes) window.addEventListener('beforeunload', alSalirDeLaPagina)
  else window.removeEventListener('beforeunload', alSalirDeLaPagina)
}

// true si se puede continuar: no hay cambios pendientes o el usuario acepta perderlos
export function confirmarSalida() {
  if (!hayPendientes) return true
  const continuar = window.confirm('Tienes cambios sin guardar en tu entrada. ¿Quieres salir sin guardarlos?')
  if (continuar) marcarCambiosPendientes(false)
  return continuar
}