import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import cloudinaryRoutes from './routes/cloudinary.js'
import { configureCloudinary } from './utils/cloudinaryUtils.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

configureCloudinary({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

app.use(cors())
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ limit: '100mb', extended: true }))

// API routes
app.use('/api', cloudinaryRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

// Serve static files from dist directory (for production)
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

// SPA fallback - serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

export default app
