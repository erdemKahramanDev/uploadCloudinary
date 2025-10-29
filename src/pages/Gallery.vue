<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const files = ref([])
const loading = ref(false)
const error = ref(null)
const isAuthenticated = ref(false)
const adminPassword = ref('')
const authError = ref('')

const searchQuery = ref('')
const currentPage = ref(1)
const perPage = 8

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

function checkAuthentication() {
  const savedAuth = sessionStorage.getItem('gallery_auth')
  if (savedAuth === 'true') {
    isAuthenticated.value = true
  }
}

function handleLogin() {
  if (adminPassword.value === ADMIN_PASSWORD) {
    isAuthenticated.value = true
    sessionStorage.setItem('gallery_auth', 'true')
    authError.value = ''
    adminPassword.value = ''
  } else {
    authError.value = 'Hatalı şifre!'
  }
}

function handleLogout() {
  isAuthenticated.value = false
  sessionStorage.removeItem('gallery_auth')
  router.push('/')
}

watch(searchQuery, () => {
  currentPage.value = 1
})

watch(isAuthenticated, (newValue) => {
  if (newValue) {
    fetchFiles()
  }
})

function getVideoUrl(file) {

  if (file.resourceType !== 'video') {
    return file.url || file.secure_url
  }

  const url = file.url || file.secure_url

  if (!url || !url.includes('cloudinary.com')) {
    return url
  }
  return url.replace('/upload/', '/upload/f_auto,q_auto/')
}

async function fetchFiles() {
  loading.value = true
  error.value = null

  try {
    const res = await fetch('/api/files', { cache: 'no-store' })
    if (!res.ok) throw new Error('Sunucu hatası')
    const data = await res.json()
    files.value = data.files || []
  } catch (e) {
    error.value = e.message || 'Hata'
  } finally {
    loading.value = false
  }
}

function handleRouteChange() {
  files.value = []
  loading.value = true
  fetchFiles()
}

onMounted(() => {
  checkAuthentication()
  if (isAuthenticated.value) {
    handleRouteChange()
    window.addEventListener('upload-complete', handleRouteChange)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('upload-complete', handleRouteChange)
})

const filteredFiles = computed(() => {
  if (!searchQuery.value || !searchQuery.value.trim()) return files.value
  const query = searchQuery.value.toLowerCase().trim()

  return files.value.filter(f => {
    const fileName = (f.name || f.id || '').toLowerCase()
    const uploaderName = (f.uploader?.name || '').toLowerCase()
    const fileFormat = (f.format || '').toLowerCase()
    const resourceType = (f.resourceType || '').toLowerCase()

    if (query === 'video' || query === 'videolar') {
      return resourceType === 'video'
    }
    if (query === 'resim' || query === 'resimler' || query === 'foto' || query === 'fotoğraf' || query === 'image') {
      return resourceType === 'image'
    }

    if (query.startsWith('.')) {
      const formatQuery = query.substring(1)
      return fileFormat === formatQuery
    }

    return fileName.includes(query) ||
           uploaderName.includes(query) ||
           fileFormat.includes(query)
  })
})

const totalPages = computed(() => Math.ceil(filteredFiles.value.length / perPage))
const paginatedFiles = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredFiles.value.slice(start, start + perPage)
})

function changePage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}
</script>

<template>
  <section class="max-w-6xl mx-auto py-6 sm:py-10 px-4 sm:px-6">
    <!-- Login Ekranı -->
    <div v-if="!isAuthenticated" class="max-w-md mx-auto">
      <div class="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-emerald-500 p-1 shadow-2xl">
        <div class="rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur p-6 md:p-10">
          <h1 class="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Admin Girişi</h1>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Galeri sadece admin kullanıcılarına açıktır.
          </p>
          <div class="space-y-4">
            <div>
              <label class="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-2">
                Şifre
              </label>
              <input
                v-model="adminPassword"
                type="password"
                @keyup.enter="handleLogin"
                class="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400 focus:outline-none bg-white dark:bg-slate-800"
                placeholder="Admin şifresini girin"
              />
            </div>
            <button
              @click="handleLogin"
              class="w-full btn-primary"
            >
              Giriş Yap
            </button>
            <p v-if="authError" class="text-rose-600 text-sm text-center">{{ authError }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Galeri Ekranı -->
    <div v-else class="rounded-2xl bg-white/95 dark:bg-slate-900/90 p-4 sm:p-6 md:p-10">
      <div class="flex items-start sm:items-center justify-between mb-4 gap-3">
        <div class="flex-1 min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold">Galeri</h1>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Misafirlerin yüklediği fotoğraflar ve videolar.
          </p>
        </div>
        <button
          @click="handleLogout"
          class="text-xs sm:text-sm text-rose-600 hover:text-rose-700 font-medium flex-shrink-0"
        >
          Çıkış Yap
        </button>
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Ara... (video, .mp4, resim)"
            class="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
          />
        </div>
        <button class="btn-primary flex-shrink-0 w-full sm:w-auto" @click="handleRouteChange">Yenile</button>
      </div>
      <div v-if="loading" class="text-center py-10 animate-pulse">Yükleniyor...</div>
      <div v-else-if="error" class="text-center py-10 text-rose-600">{{ error }}</div>
      <div v-else-if="paginatedFiles.length === 0" class="text-center py-10 text-slate-500">
        Henüz yüklenmiş fotoğraf yok.
      </div>
      <transition-group name="fade" tag="div" v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        <div v-for="f in paginatedFiles" :key="f.id" class="rounded overflow-hidden bg-slate-100">
          <a :href="getVideoUrl(f)" target="_blank" rel="noopener" class="block relative group">
            <video
              v-if="f.resourceType === 'video'"
              :src="getVideoUrl(f)"
              :poster="f.thumbnail"
              class="w-full h-32 sm:h-40 md:h-48 object-cover"
              autoplay
              loop
              muted
              playsinline
            ></video>
            <img v-else :src="f.thumbnail || f.url || f.secure_url" alt="preview" class="w-full h-32 sm:h-40 md:h-48 object-cover" />

            <div v-if="f.resourceType === 'video'" class="absolute inset-0 pointer-events-none">
              <div class="absolute top-1 sm:top-2 left-1 sm:left-2 bg-red-600 text-white text-xxs sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shadow-lg flex items-center gap-1">
                <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <span class="hidden sm:inline">VIDEO</span>
              </div>
              <div class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                <svg class="w-12 h-12 sm:w-16 sm:h-16 text-white opacity-60 group-hover:opacity-90 transition-opacity drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </a>
          <div class="p-1.5 sm:p-2 text-xxs sm:text-xs text-slate-700 overflow-hidden">
            <div class="truncate font-medium">
              {{ f.name }}
              <span v-if="f.resourceType === 'video'" class="text-xxs bg-red-500 text-white px-1 sm:px-1.5 py-0.5 rounded ml-1">VIDEO</span>
            </div>
            <div v-if="f.uploader" class="text-xxs text-slate-500 mt-1 truncate">
              <span class="font-medium">{{ f.uploader.name || 'Misafir' }}</span>
              <span v-if="f.uploader.message" class="truncate">: {{ f.uploader.message }}</span>
            </div>
            <div class="text-xxs text-slate-500 mt-1 truncate">
              {{ f.createdTime ? new Date(f.createdTime).toLocaleString() : '' }}
            </div>
          </div>
        </div>
      </transition-group>
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-8">
        <button
          class="px-3 py-1 rounded border text-sm hover:bg-slate-100 disabled:opacity-50"
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          ‹ Önceki
        </button>
        <span class="text-sm">Sayfa {{ currentPage }} / {{ totalPages }}</span>
        <button
          class="px-3 py-1 rounded border text-sm hover:bg-slate-100 disabled:opacity-50"
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          Sonraki ›
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.btn-primary {
  @apply inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white shadow hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-400;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
