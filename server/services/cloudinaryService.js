import { uploadFile } from '../utils/cloudinaryUtils.js'
import { v2 as cloudinary } from 'cloudinary'
import { getCache, setCache, deleteCache } from './redisCache.js'
import dotenv from 'dotenv'
dotenv.config()

const baseFolder = process.env.CLOUDINARY_UPLOAD_FOLDER
const filePrefix = process.env.CLOUDINARY_FILE_PREFIX || 'photo'

const CACHE_KEY_PREFIX = 'gallery:files'
const CACHE_TTL = 300

export async function uploadFilesService(files, metadata) {
  const { name, message } = metadata
  const uploadedFiles = []

  const now = new Date()
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timestamp = `${dateStr}_${timeStr}`

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const randomId = Math.random().toString(36).substring(2, 8)
    const fileName = `${filePrefix}_${timestamp}_${randomId}`

    const isVideo = file.mimetype.startsWith('video/')
    const resourceType = isVideo ? 'video' : 'image'

    const uploadResult = await uploadFile(file.buffer, {
      folder: baseFolder,
      resource_type: resourceType,
      public_id: fileName,
      unique_filename: false,
      overwrite: false,
      context: `custom_name=${name}|custom_message=${message}`,
    })

    let thumbnailUrl = uploadResult.secure_url
    let previewUrl = uploadResult.secure_url
    if (uploadResult.resource_type === 'video') {
      thumbnailUrl = uploadResult.secure_url.replace('/upload/', '/upload/f_jpg,so_2/')
      previewUrl = uploadResult.secure_url.replace('/upload/', '/upload/w_400,q_auto:low,so_0,eo_6/')
    }

    const fileNameFromId = uploadResult.public_id.split('/').pop()
    const fullFileName = `${fileNameFromId}.${uploadResult.format}`

    uploadedFiles.push({
      id: uploadResult.public_id,
      name: fullFileName,
      url: uploadResult.secure_url,
      thumbnail: thumbnailUrl,
      preview: previewUrl,
      createdTime: uploadResult.created_at,
      uploader: { name, message },
      resourceType: uploadResult.resource_type,
      format: uploadResult.format,
    })
  }
  const cacheKey = `${CACHE_KEY_PREFIX}:all`
  const cachedFiles = await getCache(cacheKey)

  if (cachedFiles && Array.isArray(cachedFiles)) {
    const updatedFiles = [...uploadedFiles, ...cachedFiles]
    await setCache(cacheKey, updatedFiles, CACHE_TTL)

    await setCache(`${CACHE_KEY_PREFIX}:total`, updatedFiles.length, CACHE_TTL)

  } else {
    await deleteCache(cacheKey)
    await deleteCache(`${CACHE_KEY_PREFIX}:total`)
  }

  return uploadedFiles
}

export async function listFilesService() {
  const cacheKey = `${CACHE_KEY_PREFIX}:all`
  const cached = await getCache(cacheKey)

  if (cached) {
    console.log(`📦 Redis cache hit! (${cached.length} dosya)`)
    return cached
  }
  console.log('🔄 Cloudinary\'dan TÜM dosyalar (resim + video) çekiliyor...')

  const allFiles = []
  let nextCursor = null
  let pageCount = 0
  const MAX_PAGES = 100

  const resourceTypes = ['image', 'video']

  for (const resourceType of resourceTypes) {
    nextCursor = null
    pageCount = 0

    do {
      pageCount++

      const result = await cloudinary.search
        .expression(`folder:${baseFolder} AND resource_type:${resourceType}`)
        .sort_by('created_at', 'desc')
        .with_field('context')
        .max_results(500)
        .next_cursor(nextCursor)
        .execute()

      const files = result.resources.map((r) => {
        const uploader = {
          name: r.context?.custom_name || '',
          message: r.context?.custom_message || '',
        }

        let thumbnailUrl = r.secure_url
        let previewUrl = r.secure_url
        if (r.resource_type === 'video') {
          thumbnailUrl = r.secure_url.replace('/upload/', '/upload/f_jpg,so_2/')
          previewUrl = r.secure_url.replace('/upload/', '/upload/w_400,q_auto:low,so_0,eo_6/')
        }

        const fileNameFromId = r.public_id.split('/').pop()
        const fullFileName = `${fileNameFromId}.${r.format}`

        return {
          id: r.public_id,
          name: fullFileName,
          url: r.secure_url,
          thumbnail: thumbnailUrl,
          preview: previewUrl,
          createdTime: r.created_at,
          uploader,
          resourceType: r.resource_type,
          format: r.format,
        }
      })

      allFiles.push(...files)
      nextCursor = result.next_cursor

      if (pageCount >= MAX_PAGES) {
        console.warn(`⚠️ Maksimum sayfa limitine ulaşıldı (${MAX_PAGES})`)
        break
      }

    } while (nextCursor)
  }

  allFiles.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))

  console.log(`✅ TOPLAM ${allFiles.length} dosya Cloudinary'dan getirildi`)

  await setCache(cacheKey, allFiles, CACHE_TTL)

  await setCache(`${CACHE_KEY_PREFIX}:total`, allFiles.length, CACHE_TTL)

  return allFiles
}

export async function getTotalFilesCount() {
  const cached = await getCache(`${CACHE_KEY_PREFIX}:total`)
  if (cached) {
    return cached
  }
  const files = await listFilesService()
  return files.length
}
