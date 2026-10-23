import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PUERTO = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/salud', (_req, res) => {
  res.json({ estado: 'ok', mensaje: 'El backend está funcionando' })
})

app.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`)
})