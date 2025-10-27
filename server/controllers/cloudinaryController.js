import { uploadFilesService, listFilesService } from '../services/cloudinaryService.js'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const MAX_FILES = 10
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

export async function uploadFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Dosya bulunamadı' })
    }

    // Dosya sayısı kontrolü
    if (req.files.length > MAX_FILES) {
      return res.status(400).json({ error: `En fazla ${MAX_FILES} dosya yükleyebilirsiniz` })
    }

    // Her dosya için validasyon
    for (const file of req.files) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.mimetype)
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.mimetype)

      // Dosya tipi kontrolü
      if (!isImage && !isVideo) {
        return res.status(400).json({
          error: `Desteklenmeyen dosya türü: ${file.originalname}. Sadece resim (JPG, JPEG, PNG, WEBP) ve video (MP4, MOV, AVI, WEBM) destekleniyor.`
        })
      }

      // Dosya boyutu kontrolü (resim ve video için farklı limitler)
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
      const maxSizeMB = isVideo ? 100 : 10

      if (file.size > maxSize) {
        return res.status(400).json({
          error: `Dosya çok büyük: ${file.originalname} (en fazla ${maxSizeMB}MB)`
        })
      }
    }

    // İsim kontrolü
    const name = req.body.name?.trim() || ''
    if (!name) {
      return res.status(400).json({ error: 'İsim alanı zorunludur' })
    }

    const message = req.body.message?.trim() || ''
    const result = await uploadFilesService(req.files, { name, message })
    res.json(result)
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message || 'Sunucu hatası' })
  }
}

export async function getFiles(req, res) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const result = await listFilesService()
    res.json({ files: result })
  } catch (err) {
    console.error('List files error:', err)
    res.status(500).json({ error: err.message || 'Sunucu hatası' })
  }
}
