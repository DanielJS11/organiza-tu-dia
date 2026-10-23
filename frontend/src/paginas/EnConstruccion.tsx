export default function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
      <h1 className="text-xl font-semibold text-slate-800">{titulo}</h1>
      <p className="mt-2 text-slate-500">Esta sección se construye en las próximas fases.</p>
    </div>
  )
}