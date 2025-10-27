import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Upload',
    component: () => import('@/components/DriveUploader.vue'),
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('@/pages/Gallery.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
