import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cloudinaryRoutes from './routes/cloudinary.js'
import { configureCloudinary } from './utils/cloudinaryUtils.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

configureCloudinary({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

app.use(cors())
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))

app.use('/api', cloudinaryRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
