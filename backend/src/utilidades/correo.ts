// ─────────────────────────────────────────────────────────────
// Envío de correos con Brevo (plan gratuito: 300 correos al día)
//
// Se usa su API por HTTPS y no SMTP, porque los servidores gratuitos (como Render)
// bloquean los puertos de SMTP. Si no hay clave configurada (por ejemplo, en desarrollo),
// el correo no se envía: se muestra en la consola del backend para poder probar igual.
// ─────────────────────────────────────────────────────────────

type Correo = { para: string; asunto: string; html: string; texto: string }

export async function enviarCorreo(correo: Correo, f: typeof fetch = fetch) {
  const clave = process.env.BREVO_API_KEY
  const remitente = process.env.CORREO_REMITENTE
  if (!clave || !remitente) {
    console.log(`[correo] (sin BREVO_API_KEY: no se envía) Para: ${correo.para}\nAsunto: ${correo.asunto}\n${correo.texto}`)
    return
  }

  const respuesta = await f('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': clave },
    body: JSON.stringify({
      sender: { name: 'Organiza tu día', email: remitente },
      to: [{ email: correo.para }],
      subject: correo.asunto,
      htmlContent: correo.html,
      textContent: correo.texto,
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!respuesta.ok) {
    throw new Error(`Brevo respondió ${respuesta.status}: ${(await respuesta.text().catch(() => '')).slice(0, 200)}`)
  }
}

// Escapa el texto que va dentro del HTML del correo (por ejemplo, el nombre del usuario)
const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function correoRecuperacion(nombre: string, enlace: string, minutos: number) {
  const texto = `Hola, ${nombre}:

Recibimos una solicitud para restablecer la contraseña de tu cuenta en Organiza tu día.
Abre este enlace para elegir una nueva (vence en ${minutos} minutos y solo se puede usar una vez):

${enlace}

Si no fuiste tú, ignora este correo: tu contraseña no cambiará.`

  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1e293b">
  <h2 style="color:#0f766e">Organiza tu día</h2>
  <p>Hola, ${escapar(nombre)}:</p>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
  <p style="margin:24px 0">
    <a href="${escapar(enlace)}" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Elegir una nueva contraseña</a>
  </p>
  <p style="font-size:13px;color:#64748b">El enlace vence en ${minutos} minutos y solo se puede usar una vez.
  Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
</div>`

  return { asunto: 'Restablece tu contraseña', html, texto }
}