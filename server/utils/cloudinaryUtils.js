import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
export function configureCloudinary(config) {
  cloudinary.config(config)
}
export async function uploadFile(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)
    readable.pipe(uploadStream)
  })
}
export async function listFiles(folder, options = {}) {
  try {
    const result = await cloudinary.search
      .expression(`folder:${folder}`)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(options.max_results || 500)
      .execute()
    return result
  } catch (error) {
    console.error('Error listing files:', error)
    throw error
  }
}

export async function generateFileName(baseFolder, prefix = 'file') {
  try {
    const cleanPrefix = prefix.replace(/\s+/g, '')

    const result = await cloudinary.search
      .expression(`folder:${baseFolder}`)
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute()

    let maxNumber = 0
    if (result && result.resources) {
      result.resources.forEach((resource) => {
        const publicId = resource.public_id
        const regex = new RegExp(`${cleanPrefix}_(\\d+)$`)
        const match = publicId.match(regex)
        if (match) {
          const num = parseInt(match[1])
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      })
    }
    return maxNumber
  } catch (error) {
    console.error('Error generating file name:', error)
    return 0
  }
}
