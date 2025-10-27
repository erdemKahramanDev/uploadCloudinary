import { Redis } from '@upstash/redis'

// Redis client oluştur
let redis = null

function getRedisClient() {
  if (!redis) {
    // Environment variables kontrolü
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      console.warn('⚠️ Redis credentials bulunamadı, in-memory cache kullanılacak')
      return null
    }

    redis = new Redis({
      url,
      token,
      automaticDeserialization: true,
    })

    console.log('✅ Redis client bağlandı')
  }

  return redis
}

/**
 * Cache'ten veri al
 * @param {string} key - Cache anahtarı
 * @returns {Promise<any|null>} Cache'teki veri veya null
 */
export async function getCache(key) {
  const client = getRedisClient()
  if (!client) return null

  try {
    const data = await client.get(key)
    if (data) {
      console.log(`📦 Redis cache hit: ${key}`)
    }
    return data
  } catch (error) {
    console.error('Redis get error:', error)
    return null
  }
}

/**
 * Cache'e veri kaydet
 * @param {string} key - Cache anahtarı
 * @param {any} value - Kaydedilecek veri
 * @param {number} ttl - Saniye cinsinden yaşam süresi (varsayılan: 300 saniye = 5 dakika)
 * @returns {Promise<boolean>} Başarılı ise true
 */
export async function setCache(key, value, ttl = 300) {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.set(key, value, { ex: ttl })
    console.log(`💾 Redis cache set: ${key} (TTL: ${ttl}s)`)
    return true
  } catch (error) {
    console.error('Redis set error:', error)
    return false
  }
}

/**
 * Cache'ten veri sil
 * @param {string} key - Silinecek cache anahtarı
 * @returns {Promise<boolean>} Başarılı ise true
 */
export async function deleteCache(key) {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.del(key)
    console.log(`🗑️ Redis cache deleted: ${key}`)
    return true
  } catch (error) {
    console.error('Redis delete error:', error)
    return false
  }
}

/**
 * Pattern ile eşleşen tüm cache'leri sil
 * @param {string} pattern - Silinecek pattern (örn: 'gallery:*')
 * @returns {Promise<boolean>} Başarılı ise true
 */
export async function deleteCachePattern(pattern) {
  const client = getRedisClient()
  if (!client) return false

  try {
    // Upstash Redis'te SCAN komutu yok, keys kullanıyoruz (küçük veri setleri için uygun)
    const keys = await client.keys(pattern)
    if (keys && keys.length > 0) {
      await Promise.all(keys.map(key => client.del(key)))
      console.log(`🗑️ Redis cache pattern deleted: ${pattern} (${keys.length} keys)`)
    }
    return true
  } catch (error) {
    console.error('Redis delete pattern error:', error)
    return false
  }
}