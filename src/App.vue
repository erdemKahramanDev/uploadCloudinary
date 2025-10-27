<script setup>
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
    <nav class="sticky top-0 z-10 backdrop-blur bg-white/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-600 to-emerald-500 shadow-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span class="font-semibold tracking-tight text-slate-900 dark:text-white">Paylaşım Galerisi</span>
        </div>
        <div class="flex items-center gap-4">
          <router-link to="/" class="text-sm text-slate-600 dark:text-slate-300">Yükle</router-link>
          <router-link to="/gallery" class="text-sm text-slate-600 dark:text-slate-300">Galeri</router-link>
        </div>
      </div>
    </nav>

    <main>
      <router-view />
    </main>

    <footer class="mt-10 py-8 border-t border-slate-200 dark:border-slate-800">
      <div class="max-w-6xl mx-auto px-4">
        <div class="text-center space-y-3">
          <div class="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-500">
            <span>Developed by</span>
            <a
              href="https://aekahraman.com"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors inline-flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              AEKahraman
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped></style>
