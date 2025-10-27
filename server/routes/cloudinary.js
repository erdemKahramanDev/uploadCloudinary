import express from 'express'
import multer from 'multer'
import { uploadFiles, getFiles } from '../controllers/cloudinaryController.js'

const router = express.Router()

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (video için)
    files: 10, // Maksimum 10 dosya
  },
})

router.post('/upload', upload.array('files', 10), uploadFiles)

router.get('/files', getFiles)

export default router
