// Aviso que se lanza cuando el backend dice que la sesión ya no vale (la escucha ProveedorSesion)
export const EVENTO_SESION_EXPIRADA = 'sesion-expirada'

// Función única para hablar con el backend: envía la cookie de sesión y convierte los errores en mensajes
export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    // Si la sesión venció o la contraseña cambió en otro dispositivo, se vuelve a la página de ingreso
    if (respuesta.status === 401 && !ruta.startsWith('/auth/')) window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA))
    throw new Error(datos.error || 'No se pudo conectar con el servidor')
  }
  return datos as T
}