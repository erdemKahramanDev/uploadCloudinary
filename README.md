# Paylaşım Galerisi

Modern, full-stack bir fotoğraf ve video paylaşım platformu. Vue.js, Node.js, Cloudinary ve Redis ile geliştirilmiştir.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)

## ✨ Özellikler

- 📸 **Fotoğraf & Video Yükleme** - JPG, JPEG, PNG, WEBP, MP4, MOV, AVI, WEBM desteği
- 🗜️ **Otomatik Sıkıştırma** - 10MB+ resimler otomatik olarak optimize edilir (max 50MB)
- 🎬 **Video Önizleme** - Videolar GIF benzeri otomatik oynatılır
- 🔍 **Akıllı Arama** - Format, tip ve isim bazlı filtreleme
- 📱 **Mobile-First** - Responsive tasarım, her cihazda mükemmel çalışır
- ⚡ **Redis Cache** - Hızlı performans için cache sistemi
- 🌓 **Dark Mode** - Otomatik tema desteği
- 🔒 **Güvenli** - Cloudinary ile profesyonel dosya yönetimi

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+
- Redis (opsiyonel)
- Cloudinary hesabı

### Kurulum

1. **Bağımlılıkları yükleyin**
```bash
npm install
```

2. **Environment değişkenlerini ayarlayın**

`.env` dosyası oluşturun:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=gallery
CLOUDINARY_FILE_PREFIX=photo

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

PORT=3000
NODE_ENV=development
```

3. **Geliştirme sunucusunu başlatın**
```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3000`

## 🛠️ Teknolojiler

**Frontend:** Vue 3, Vite, TailwindCSS, Vue Router
**Backend:** Node.js, Express, Cloudinary, Redis, Multer

## 👨‍💻 Geliştirici

**AEKahraman** - [aekahraman.com](https://aekahraman.com)

---

⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!
