<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import imageCompression from 'browser-image-compression'

const dragOver = ref(false)
const fileInput = ref(null)
const uploads = reactive([])

const guestName = ref('')
const guestMessage = ref('')
const isUploading = ref(false)
const isCompressing = ref(false)
const compressionStatus = ref('')

// Toast notification
const toast = ref({ show: false, message: '', type: 'success' })

function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => {
    toast.value.show = false
  }, 4000)
}

const MAX_FILES = 10
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

const errors = reactive({ name: null, files: null })

const canQueue = computed(() => {
  errors.name = guestName.value.trim() ? null : 'Adınız gerekli.'
  return !errors.name
})

async function compressImage(file) {
  if (file.size <= MAX_IMAGE_SIZE) {
    return file
  }

  try {
    const options = {
      maxSizeMB: 9.5,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    }

    const compressedFile = await imageCompression(file, options)

    return compressedFile
  } catch (error) {
    return file
  }
}

function validateFile(file, skipSizeCheck = false) {
  const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    return `Desteklenmeyen dosya türü: ${file.name}. Sadece resim (JPG, JPEG, PNG, WEBP) ve video (MP4, MOV, AVI, WEBM) destekleniyor.`
  }

  if (skipSizeCheck) return null

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  const maxSizeMB = isVideo ? 100 : 10

  if (file.size > maxSize) {
    if (isImage && file.size <= 50 * 1024 * 1024) {
      return null
    }
    return `Dosya çok büyük: ${file.name} (en fazla ${isImage ? '50' : maxSizeMB}MB)`
  }

  return null
}

async function onFilesSelected(files) {
  if (!files || files.length === 0) return
  const list = Array.from(files)

  if (uploads.length + list.length > MAX_FILES) {
    errors.files = `En fazla ${MAX_FILES} dosya yükleyebilirsiniz.`
    return
  }

  isCompressing.value = true
  errors.files = null

  for (let i = 0; i < list.length; i++) {
    const file = list[i]

    const error = validateFile(file, true)
    if (error) {
      errors.files = error
      continue
    }

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type)

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      compressionStatus.value = `Sıkıştırılıyor: ${file.name} (${i + 1}/${list.length})`
      const processedFile = await compressImage(file)

      const sizeError = validateFile(processedFile)
      if (sizeError) {
        errors.files = `Sıkıştırma sonrası hala çok büyük: ${file.name}`
        continue
      }

      queueFile(processedFile, file.size, isVideo)
    } else {
      const sizeError = validateFile(file)
      if (sizeError) {
        errors.files = sizeError
        continue
      }
      queueFile(file, null, isVideo)
    }
  }

  compressionStatus.value = ''
  isCompressing.value = false

  if (fileInput.value) fileInput.value.value = ''
}

function queueFile(file, originalSize = null, isVideo = false) {
  const localId = 'u-' + Date.now() + '-' + Math.floor(Math.random() * 10000)
  const preview = URL.createObjectURL(file)
  const item = {
    localId,
    file,
    preview,
    status: 'queued',
    progress: 0,
    id: null,
    url: null,
    errorMessage: null,
    originalSize,
    wasCompressed: originalSize !== null,
    isVideo,
  }
  uploads.push(item)
}

function removeFile(item) {
  if (item.status === 'uploading') return
  const i = uploads.findIndex((u) => u.localId === item.localId)
  if (i !== -1) {
    URL.revokeObjectURL(uploads[i].preview)
    uploads.splice(i, 1)
  }
}

async function uploadAll() {
  errors.files = null
  if (!canQueue.value) return

  // Sadece bekleyen dosyaları bul
  const pendingItems = uploads.filter(u => u.status === 'queued' || u.status === 'error')

  if (pendingItems.length === 0) {
    errors.files = 'Yüklenecek dosya yok.'
    return
  }

  if (isUploading.value) return

  isUploading.value = true
  try {
    await uploadItems(pendingItems)

    // Başarı mesajı göster
    const count = pendingItems.length
    showToast(`${count} dosya başarıyla yüklendi! 🎉`, 'success')

    // Sadece inputları temizle, önizlemeler kalsın
    resetForm()

  } catch (error) {
    errors.files = error.message || 'Yükleme sırasında bir hata oluştu.'
    showToast(error.message || 'Yükleme başarısız oldu', 'error')
  } finally {
    isUploading.value = false
  }
}

function resetForm() {
  guestName.value = ''
  guestMessage.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function uploadItems(items, retryCount = 0) {
  const MAX_RETRIES = 2

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()

    // Tüm itemları yükle (zaten filtrelenmiş halde geliyor)
    items.forEach(item => {
      form.append('files', item.file)
      item.status = 'uploading'
    })

    form.append('name', guestName.value || '')
    form.append('message', guestMessage.value || '')

    xhr.timeout = 120000

    xhr.open('POST', '/api/upload')

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        const totalProgress = Math.min(100, (e.loaded / e.total) * 100)
        items.forEach(item => {
          if (item.status === 'uploading') item.progress = totalProgress
        })
      }
    }

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)

          if (Array.isArray(res)) {
            res.forEach((fileData, index) => {
              const item = items[index]
              if (!item) return
              item.id = fileData.id
              item.url = fileData.url || fileData.secure_url
              item.progress = 100
              item.status = 'done'
            })
          } else {
            items[0].id = res.id
            items[0].url = res.url || res.secure_url
            items[0].progress = 100
            items[0].status = 'done'
          }

          resolve()
        } catch (e) {
          items.forEach(item => {
            item.status = 'error'
            item.errorMessage = 'Sunucu yanıtı işlenirken hata oluştu'
          })
          reject(new Error('Sunucu yanıtı işlenirken hata oluştu'))
        }
      } else {
        let errorMessage = 'Yükleme başarısız oldu'

        try {
          const errorData = JSON.parse(xhr.responseText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
        }

        items.forEach(item => {
          item.status = 'error'
          item.errorMessage = errorMessage
        })

        reject(new Error(errorMessage))
      }
    }

    xhr.onerror = function () {
      if (retryCount < MAX_RETRIES) {
        items.forEach(item => {
          if (item.status === 'error') {
            item.status = 'queued'
            item.progress = 0
          }
        })

        setTimeout(() => {
          uploadItems(items, retryCount + 1)
            .then(resolve)
            .catch(reject)
        }, 2000)
      } else {
        items.forEach(item => {
          item.status = 'error'
          item.errorMessage = 'Bağlantı hatası - Lütfen tekrar deneyin'
        })
        reject(new Error('Bağlantı hatası - Lütfen tekrar deneyin'))
      }
    }

    xhr.ontimeout = function () {
      items.forEach(item => {
        item.status = 'error'
        item.errorMessage = 'Yükleme zaman aşımına uğradı'
      })
      reject(new Error('Yükleme zaman aşımına uğradı'))
    }

    xhr.send(form)
  })
}



function onDrop(e) {
  e.preventDefault()
  dragOver.value = false
  const dt = e.dataTransfer
  if (!dt) return
  onFilesSelected(dt.files)
}

function onBrowse() {
  fileInput.value?.click()
}

// Component unmount olduğunda preview URL'lerini temizle (memory leak önleme)
onBeforeUnmount(() => {
  uploads.forEach(u => {
    if (u.preview) {
      URL.revokeObjectURL(u.preview)
    }
  })
})
</script>

<template>
  <section class="max-w-4xl mx-auto py-10 px-4">
    <div class="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 p-1 shadow-2xl">
      <div class="rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur p-6 md:p-10">
        <header class="space-y-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Fotoğraf & Video Yükleme</h1>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Lütfen adınızı ve isteğe bağlı mesajınızı girin, ardından fotoğraf/videolarınızı yükleyin.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Adınız <span class="text-red-500">*</span>
              </label>
              <input
                v-model="guestName"
                type="text"
                class="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:outline-none bg-white dark:bg-slate-800"
                placeholder="Örn: Ahmet Yılmaz"
              />
            </div>
            <div>
              <label class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Mesaj (İsteğe bağlı)
              </label>
              <input
                v-model="guestMessage"
                type="text"
                class="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:outline-none bg-white dark:bg-slate-800"
                placeholder="Tebrik mesajı veya not..."
              />
            </div>
          </div>
        </header>

        <div class="mt-6 grid gap-6 md:grid-cols-3">
          <aside class="space-y-4 md:order-2">
            <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800">
              <h3 class="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                Yükleme Bilgileri
              </h3>
              <ul class="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span>
                  <span>Resim: JPG, JPEG, PNG, WEBP</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span>
                  <span>Video: MP4, MOV, AVI, WEBM</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span>
                  <span>Resim: Max 50MB (otomatik sıkıştırılır)</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span>
                  <span>Video: Max 100MB</span>
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-600">✓</span>
                  <span>Maksimum: 10 dosya</span>
                </li>
              </ul>
            </div>

            <div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300">
              <p class="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                </svg>
                Gizlilik
              </p>
              <p class="mt-1.5 text-xs">Dosyalarınız Cloudinary üzerinde güvenli bir şekilde saklanır.</p>
            </div>
          </aside>

          <div class="md:col-span-2 md:order-1">
            <div class="rounded-xl border-2 border-dashed" :class="[ dragOver ? 'ring-4 ring-brand-300/60' : 'border-slate-300 dark:border-slate-600']" @dragover.prevent="dragOver = true" @dragleave.prevent="dragOver = false" @drop="onDrop">
              <div class="p-6 text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                    <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14l4-3 3 3 4-4 6 3z" />
                  </svg>
                </div>
                <h2 class="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Fotoğraf ve Videolarınızı ekleyin</h2>
                <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Sürükleyip bırakın veya bilgisayarınızdan seçin</p>
                <div class="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <button class="btn-primary w-full sm:w-auto" @click="onBrowse" :disabled="isUploading">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Dosya Seç
                  </button>
                  <button class="btn-secondary w-full sm:w-auto" @click="uploadAll" :disabled="isUploading">
                    <svg v-if="!isUploading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ isUploading ? 'Yükleniyor...' : 'Tümünü Yükle' }}
                  </button>
                  <input ref="fileInput" type="file" class="hidden" multiple accept="image/*,video/*" @change="onFilesSelected(($event.target).files)" />
                </div>
                <p v-if="errors.name" class="text-rose-600 text-sm mt-3">{{ errors.name }}</p>
                <p v-if="errors.files" class="text-rose-600 text-sm mt-2">{{ errors.files }}</p>
                <p v-if="isCompressing" class="text-brand-600 text-sm mt-3 font-medium">
                  {{ compressionStatus || 'Dosyalar işleniyor...' }}
                </p>
              </div>
            </div>

            <div v-if="uploads.length" class="mt-6 grid gap-3">
              <div v-for="u in uploads" :key="u.localId" class="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white/70 dark:bg-slate-800/60 flex items-center gap-4">
                <video v-if="u.isVideo" :src="u.preview" class="w-20 h-20 object-cover rounded-md" muted></video>
                <img v-else :src="u.preview" alt="preview" class="w-20 h-20 object-cover rounded-md" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-slate-900 dark:text-white truncate">{{ u.file.name }}</p>
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span>{{ (u.file.size/1024/1024).toFixed(2) }} MB</span>
                    <span v-if="u.wasCompressed" class="text-emerald-600 font-medium">
                      ({{ (u.originalSize/1024/1024).toFixed(2) }} MB'dan sıkıştırıldı)
                    </span>
                  </div>
                  <div class="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all" :style="{ width: `${u.progress}%` }" />
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <div class="text-xs text-slate-600 dark:text-slate-300">{{ u.status === 'uploading' ? 'Yükleniyor' : u.status === 'done' ? 'Tamamlandı' : u.status === 'error' ? 'Hata' : 'Beklemede' }}</div>
                  <div class="flex items-center gap-2">
                    <a v-if="u.url" :href="u.url" target="_blank" rel="noopener" class="btn-link">Görüntüle</a>
                    <button class="text-sm text-rose-600" @click="removeFile(u)" :disabled="u.status === 'uploading'">Kaldır</button>
                  </div>
                  <p v-if="u.errorMessage" class="text-rose-600 text-sm">{{ u.errorMessage }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div
        v-if="toast.show"
        class="fixed bottom-6 right-6 z-50 max-w-md"
      >
        <div
          class="rounded-lg shadow-2xl p-4 backdrop-blur-sm"
          :class="toast.type === 'success' ? 'bg-emerald-500/95 text-white' : 'bg-rose-500/95 text-white'"
        >
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0">
              <svg v-if="toast.type === 'success'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1 font-medium">
              {{ toast.message }}
            </div>
            <button
              @click="toast.show = false"
              class="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.btn-primary { @apply inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white shadow hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed; }
.btn-secondary { @apply inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed; }
.btn-link { @apply text-brand-600 hover:text-brand-700 font-medium underline underline-offset-4; }

/* Toast Animation */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}
.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
