// Función única para hablar con el backend: envía la cookie de sesión y convierte los errores en mensajes
export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    throw new Error(datos.error || 'No se pudo conectar con el servidor')
  }
  return datos as T
}