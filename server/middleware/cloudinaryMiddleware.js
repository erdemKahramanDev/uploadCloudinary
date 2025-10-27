import multer from 'multer'
const storage = multer.memoryStorage()
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
}).array('files', 10)
