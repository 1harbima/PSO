# 📦 CI/CD Documentation — Library Management System (PSO-1)

> Dokumen ini menjelaskan secara lengkap setup CI/CD yang diimplementasikan di project ini,
> mulai dari konsep dasar, struktur file, cara kerja, hingga cara menjalankannya.

---

## 📖 Daftar Isi

1. [Apa itu CI/CD?](#1-apa-itu-cicd)
2. [Gambaran Umum Arsitektur CI/CD](#2-gambaran-umum-arsitektur-cicd)
3. [File yang Terlibat](#3-file-yang-terlibat)
4. [Penjelasan Fitur Baru: Health Check API](#4-penjelasan-fitur-baru-health-check-api)
5. [Penjelasan Unit Test](#5-penjelasan-unit-test)
6. [Penjelasan GitHub Actions Workflow](#6-penjelasan-github-actions-workflow)
7. [Cara Menjalankan (Lokal)](#7-cara-menjalankan-lokal)
8. [Cara Mengaktifkan CI/CD di GitHub](#8-cara-mengaktifkan-cicd-di-github)
9. [Alur Lengkap Saat Push ke GitHub](#9-alur-lengkap-saat-push-ke-github)
10. [Pengembangan Selanjutnya (Deploy Nyata)](#10-pengembangan-selanjutnya-deploy-nyata)

---

## 1. Apa itu CI/CD?

```
CI = Continuous Integration   → Otomatis test & build setiap ada perubahan kode
CD = Continuous Delivery      → Otomatis siapkan/deploy kode ke server setelah CI lulus
```

**Tanpa CI/CD:**
```
Developer push kode → (manual) test sendiri → (manual) build → (manual) upload ke server
```

**Dengan CI/CD:**
```
Developer push kode → GitHub Actions otomatis:
                        ├── jalankan test
                        ├── build frontend
                        ├── cek kualitas kode
                        └── (opsional) deploy ke server
```

---

## 2. Gambaran Umum Arsitektur CI/CD

```
                         ┌─────────────────────────────────────────┐
                         │            GITHUB ACTIONS                │
  git push               │                                          │
─────────────►  Trigger  │  ┌─────────────┐   ┌─────────────────┐  │
  main/develop           │  │ 🧪 Backend  │   │ 🏗️  Frontend   │  │
                         │  │   Tests     │   │    Build        │  │
                         │  └──────┬──────┘   └────────┬────────┘  │
                         │         │                    │           │
                         │  ┌──────▼──────┐            │           │
                         │  │ 🔍 Code    │            │           │
                         │  │  Quality   │            │           │
                         │  └──────┬──────┘            │           │
                         │         │                    │           │
                         │         └──────────┬─────────┘           │
                         │                    ▼                     │
                         │         ┌─────────────────────┐          │
                         │         │ 🚀 Deployment       │          │
                         │         │    Summary          │          │
                         │         │  (hanya di main)    │          │
                         │         └─────────────────────┘          │
                         └─────────────────────────────────────────┘
```

> **Catatan:** Job `backend-test`, `frontend-build`, dan `lint-check` berjalan **secara paralel**
> (bersamaan) untuk menghemat waktu. Job `deployment-summary` baru jalan setelah **ketiganya lulus**.

---

## 3. File yang Terlibat

```
PSO-1/
├── .github/
│   └── workflows/
│       └── ci-cd.yml              ← 🔧 Definisi pipeline GitHub Actions
│
├── backend/
│   ├── routes/
│   │   └── health.js              ← 🆕 Fitur baru: Health Check endpoint
│   ├── tests/
│   │   └── health.test.js         ← 🆕 Unit test untuk health endpoint
│   ├── babel.config.js            ← 🆕 Konfigurasi Babel (untuk Jest + ESModule)
│   ├── package.json               ← 🔄 Ditambah: Jest, Supertest, test scripts
│   └── server.js                  ← 🔄 Ditambah: register route /api/health
│
└── frontend/
    └── (tidak ada perubahan)      ← Frontend hanya di-build, tidak ada kode baru
```

---

## 4. Penjelasan Fitur Baru: Health Check API

File: [`backend/routes/health.js`](backend/routes/health.js)

Health Check adalah endpoint standar industri yang dipakai oleh:
- **CI/CD pipeline** → untuk memverifikasi server berjalan setelah deploy
- **Load balancer** → untuk cek apakah server masih hidup
- **Monitoring tools** → untuk alert jika server down

### Endpoint 1: `GET /api/health`

```js
router.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Library Management System API is running",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});
```

**Response:**
```json
{
  "status": "OK",
  "message": "Library Management System API is running",
  "timestamp": "2026-06-19T06:11:00.000Z",
  "version": "1.0.0"
}
```

### Endpoint 2: `GET /api/health/ping`

```js
router.get("/ping", (req, res) => {
  res.status(200).json({ pong: true });
});
```

**Response:**
```json
{
  "pong": true
}
```

### Mengapa tidak butuh MongoDB?

Endpoint ini **tidak memanggil database sama sekali**, sehingga:
- Bisa ditest di CI tanpa setup MongoDB
- Tetap bisa menjawab request bahkan saat DB sedang bermasalah
- Cocok untuk health check oleh load balancer

---

## 5. Penjelasan Unit Test

File: [`backend/tests/health.test.js`](backend/tests/health.test.js)

**Tools yang digunakan:**
| Tool | Fungsi |
|------|--------|
| **Jest** | Test runner — menjalankan dan melaporkan hasil test |
| **Supertest** | HTTP testing — simulasi request ke Express tanpa server beneran jalan |
| **Babel** | Transpiler — mengkonversi `import/export` ESModule agar dipahami Jest |

### Struktur Test

```
Health Check Endpoint
├── GET /api/health
│   ├── ✓ should return status 200
│   ├── ✓ should return status OK
│   ├── ✓ should return a message
│   ├── ✓ should return a timestamp
│   └── ✓ should return a version field
└── GET /api/health/ping
    ├── ✓ should return status 200
    └── ✓ should return pong: true
```

### Cara kerja test:

```js
// 1. Buat Express app kecil khusus untuk test (tanpa MongoDB)
const app = express();
app.use("/api/health", healthRoutes);

// 2. Simulasi HTTP request menggunakan supertest
const response = await request(app).get("/api/health");

// 3. Cek hasilnya sesuai ekspektasi
expect(response.status).toBe(200);
expect(response.body.status).toBe("OK");
```

### Mengapa test tanpa koneksi MongoDB?

Karena CI/CD runner (GitHub Actions) **tidak punya MongoDB**. Dengan memisahkan
test health check dari database, test bisa berjalan di environment manapun.

---

## 6. Penjelasan GitHub Actions Workflow

File: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)

### Trigger (Kapan CI/CD Berjalan?)

```yaml
on:
  push:
    branches:
      - main      # setiap push ke main
      - develop   # setiap push ke develop
  pull_request:
    branches:
      - main      # setiap ada PR yang ingin merge ke main
      - develop   # setiap ada PR yang ingin merge ke develop
```

---

### JOB 1: 🧪 Backend Tests

```yaml
backend-test:
  runs-on: ubuntu-latest   # pakai mesin virtual Linux di cloud
  steps:
    1. Checkout kode dari repo
    2. Setup Node.js 18
    3. yarn install (install semua dependencies)
    4. yarn test (jalankan Jest)
    5. yarn test:coverage (jalankan Jest + laporan coverage)
    6. Upload hasil coverage sebagai artifact (bisa didownload 7 hari)
```

**Apa yang dicek?**
- Apakah semua unit test lulus
- Berapa persen kode yang sudah ter-test (code coverage)

---

### JOB 2: 🏗️ Frontend Build

```yaml
frontend-build:
  runs-on: ubuntu-latest
  steps:
    1. Checkout kode dari repo
    2. Setup Node.js 18
    3. yarn install
    4. yarn build (build React → menghasilkan folder /build)
    5. Upload hasil build sebagai artifact (bisa didownload 7 hari)
```

**Apa yang dicek?**
- Apakah kode React bisa di-compile tanpa error
- Hasil build siap untuk di-deploy ke server

**Catatan penting:**
```yaml
env:
  CI: false   # ini penting! tanpa ini, semua warning React jadi ERROR
```

---

### JOB 3: 🔍 Code Quality

```yaml
lint-check:
  runs-on: ubuntu-latest
  steps:
    1. Checkout kode dari repo
    2. Setup Node.js 18
    3. Cek struktur folder backend (routes, models, dll)
    4. Tampilkan info health endpoint
```

**Apa yang dicek?**
- Struktur file proyek sudah sesuai
- File-file penting ada di tempatnya

---

### JOB 4: 🚀 Deployment Summary

```yaml
deployment-summary:
  needs: [backend-test, frontend-build, lint-check]  # tunggu semua job lain selesai
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

**Apa yang dilakukan?**
- Hanya berjalan jika **push ke branch `main`** (bukan develop, bukan PR)
- Hanya berjalan jika **semua 3 job sebelumnya lulus**
- Menampilkan ringkasan: branch, commit SHA, siapa yang push

---

## 7. Cara Menjalankan (Lokal)

### Jalankan Test Backend

```bash
# masuk ke folder backend
cd backend

# jalankan semua test
yarn test

# jalankan test + lihat code coverage
yarn test:coverage
```

**Output yang diharapkan:**
```
PASS tests/health.test.js
  Health Check Endpoint
    GET /api/health
      ✓ should return status 200 (176 ms)
      ✓ should return status OK (48 ms)
      ✓ should return a message (23 ms)
      ✓ should return a timestamp (43 ms)
      ✓ should return a version field (24 ms)
    GET /api/health/ping
      ✓ should return status 200 (20 ms)
      ✓ should return pong: true (12 ms)

Tests: 7 passed, 7 total ✅
```

### Coba Health Endpoint Secara Manual

```bash
# 1. Pastikan backend berjalan
cd backend
node server.js

# 2. Di terminal lain, coba endpoint
curl http://localhost:4000/api/health
curl http://localhost:4000/api/health/ping
```

### Build Frontend Lokal

```bash
cd frontend
yarn build
# hasil build ada di folder frontend/build/
```

---

## 8. Cara Mengaktifkan CI/CD di GitHub

### Langkah 1: Push ke GitHub

```bash
cd /Users/user/Documents/PSO-1

# pastikan sudah ada remote origin
git remote -v

# push ke branch main
git push origin master
# atau jika branch utama bernama main:
git push origin main
```

### Langkah 2: Lihat Pipeline Berjalan

1. Buka repository di **github.com**
2. Klik tab **"Actions"** di bagian atas
3. Lihat workflow **"CI/CD - Library Management System"** berjalan
4. Klik untuk melihat detail setiap job

### Langkah 3: Tambah Secret (Opsional)

Jika sudah punya URL backend production:

1. Di GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Klik **"New repository secret"**
3. Tambah:

| Name | Value |
|------|-------|
| `REACT_APP_API_URL` | `https://your-backend.railway.app/` |

---

## 9. Alur Lengkap Saat Push ke GitHub

```
Developer                    GitHub                    GitHub Actions
    │                           │                           │
    │  git push origin main     │                           │
    ├──────────────────────────►│                           │
    │                           │   trigger workflow        │
    │                           ├──────────────────────────►│
    │                           │                           │
    │                           │         [paralel]         │
    │                           │    ┌──────────────────────┤
    │                           │    │ Job 1: Backend Test  │
    │                           │    │  - install deps      │
    │                           │    │  - yarn test         │
    │                           │    │  - upload coverage   │
    │                           │    ├──────────────────────┤
    │                           │    │ Job 2: Frontend Build│
    │                           │    │  - install deps      │
    │                           │    │  - yarn build        │
    │                           │    │  - upload build      │
    │                           │    ├──────────────────────┤
    │                           │    │ Job 3: Code Quality  │
    │                           │    │  - cek struktur file │
    │                           │    └──────────────────────┤
    │                           │                           │
    │                           │     [semua lulus?]        │
    │                           │    ┌──────────────────────┤
    │                           │    │ Job 4: Deploy Summary│
    │                           │    │  - tampilkan ringkasan│
    │                           │    └──────────────────────┤
    │                           │                           │
    │   ✅ Pipeline selesai!    │                           │
    │◄──────────────────────────┤                           │
```

---

## 10. Pengembangan Selanjutnya (Deploy Nyata)

Untuk menambahkan deploy otomatis ke server, tambahkan step ini di Job 4:

### Option A: Deploy Backend ke Railway

```yaml
- name: Deploy Backend to Railway
  uses: bervProject/railway-deploy@main
  with:
    railway_token: ${{ secrets.RAILWAY_TOKEN }}
    service: library-backend
```

### Option B: Deploy Frontend ke Vercel

```yaml
- name: Deploy Frontend to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    working-directory: ./frontend
```

### Option C: Deploy ke VPS dengan SSH

```yaml
- name: Deploy to VPS
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      cd /var/www/library-app
      git pull origin main
      cd backend && yarn install && pm2 restart backend
```

---

> **Dibuat untuk keperluan mata kuliah PSO (Pengujian dan Standar Open Source)**
> Stack: MERN (MongoDB, Express, React, Node.js)
> CI/CD: GitHub Actions
