# 🔧 Panduan Setup Azure untuk CI/CD — PSO-1

> Ikuti panduan ini step-by-step setelah workflow sudah di-push ke GitHub.
> Estimasi waktu: **~30–45 menit** (sekali saja, tidak perlu diulang).

---

## 📋 Yang Perlu Disiapkan

- [x] Akun Azure for Students → https://azure.microsoft.com/en-us/free/students
- [x] Akun MongoDB Atlas → https://www.mongodb.com/atlas
- [x] Akun GitHub (sudah punya)
- [x] Workflow `.github/workflows/ci-cd.yml` sudah di-push

---

## BAGIAN 1: Setup MongoDB Atlas (Database Gratis)

### Step 1.1 — Buat Akun & Cluster

1. Buka https://www.mongodb.com/atlas/database
2. Klik **"Try Free"** → daftar dengan email
3. Setelah login, klik **"Build a Database"**
4. Pilih **"M0 FREE"** (bukan yang berbayar!)
5. Provider: **Azure** | Region: **Southeast Asia (Singapore)**
6. Cluster Name: `library-pso`
7. Klik **"Create"**

### Step 1.2 — Buat Database User

1. Pilih **"Username and Password"**
2. Username: `libraryuser`
3. Password: buat yang kuat, **catat password ini!**
4. Klik **"Create User"**

### Step 1.3 — Izinkan Akses dari Mana Saja

1. Di bagian "Where would you like to connect from?" pilih **"My Local Environment"**
2. Klik **"Add My Current IP"** → lalu ubah IP menjadi `0.0.0.0/0` (allow all)
   > ⚠️ Ini untuk kemudahan CI/CD. Di production nyata, batasi hanya IP Azure.
3. Klik **"Finish and Close"**

### Step 1.4 — Dapatkan Connection String

1. Klik **"Connect"** pada cluster
2. Pilih **"Connect your application"**
3. Driver: **Node.js** | Version: **4.1 or later**
4. Copy connection string, contoh:
   ```
   mongodb+srv://libraryuser:<password>@library-pso.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Ganti `<password>` dengan password yang tadi dibuat
6. Tambahkan nama database di akhir:
   ```
   mongodb+srv://libraryuser:YOURPASSWORD@library-pso.xxxxx.mongodb.net/librarydb?retryWrites=true&w=majority
   ```
7. **Simpan string ini** — akan dipakai sebagai `MONGO_URL`

---

## BAGIAN 2: Setup Azure App Service (Backend)

### Step 2.1 — Buat Resource Group

1. Buka https://portal.azure.com
2. Search **"Resource groups"** → klik **"Create"**
3. Isi:
   - Subscription: **Azure for Students**
   - Resource group name: `rg-library-pso`
   - Region: **Southeast Asia**
4. Klik **"Review + create"** → **"Create"**

### Step 2.2 — Buat App Service (Backend)

1. Search **"App Services"** → klik **"Create"** → **"Web App"**
2. Isi form:

   | Field | Value |
   |-------|-------|
   | Resource Group | `rg-library-pso` |
   | Name | `library-pso-api` ← **ini jadi URL-nya** |
   | Publish | **Code** |
   | Runtime stack | **Node 18 LTS** |
   | Operating System | **Linux** |
   | Region | **Southeast Asia** |
   | Pricing plan | **Free F1** (pilih ini!) |

3. Klik **"Review + create"** → **"Create"**
4. Tunggu ~2 menit sampai deployment selesai

### Step 2.3 — Konfigurasi Environment Variables Backend

1. Buka App Service `library-pso-api` yang baru dibuat
2. Klik **"Configuration"** di sidebar kiri
3. Klik **"New application setting"** untuk setiap variabel berikut:

   | Name | Value |
   |------|-------|
   | `MONGO_URL` | connection string MongoDB Atlas dari Step 1.4 |
   | `PORT` | `8080` |

4. Klik **"Save"** → **"Continue"**

### Step 2.4 — Download Publish Profile

1. Masih di halaman App Service `library-pso-api`
2. Klik **"Overview"** → klik tombol **"Download publish profile"**
3. File `.PublishSettings` akan terdownload
4. **Buka file tersebut dengan text editor** (Notepad/VSCode)
5. **Copy SEMUA isinya** — akan dipakai sebagai GitHub Secret

---

## BAGIAN 3: Setup Azure Static Web Apps (Frontend)

### Step 3.1 — Buat Static Web App

1. Search **"Static Web Apps"** → klik **"Create"**
2. Isi form:

   | Field | Value |
   |-------|-------|
   | Resource Group | `rg-library-pso` |
   | Name | `library-pso-web` |
   | Plan type | **Free** |
   | Region | **East Asia** |
   | Source | **GitHub** |

3. Klik **"Sign in with GitHub"** → authorize Azure
4. Setelah login:

   | Field | Value |
   |-------|-------|
   | Organization | akun GitHub kamu |
   | Repository | `PSO` (repo `1harbima/PSO`) |
   | Branch | `master` |

5. Build Details:

   | Field | Value |
   |-------|-------|
   | Build Presets | **React** |
   | App location | `/frontend` |
   | Output location | `build` |

6. Klik **"Review + create"** → **"Create"**

> ⚠️ Azure otomatis akan menambahkan workflow file ke repo kamu. **Hapus file itu** karena kita sudah punya workflow sendiri. Atau pilih "Custom" di Build Presets agar Azure tidak auto-generate.

### Step 3.2 — Ambil Deployment Token

1. Buka Static Web App `library-pso-web`
2. Klik **"Manage deployment token"** di Overview
3. **Copy token-nya** — akan dipakai sebagai GitHub Secret

---

## BAGIAN 4: Tambahkan GitHub Secrets

Ini adalah bagian terpenting — tanpa ini, pipeline tidak bisa deploy.

### Cara Buka GitHub Secrets

1. Buka repo **https://github.com/1harbima/PSO**
2. Klik **"Settings"** (tab paling kanan)
3. Sidebar kiri: **"Secrets and variables"** → **"Actions"**
4. Klik **"New repository secret"**

### Daftar Secret yang Harus Ditambahkan

Tambahkan **5 secret** berikut satu per satu:

| Secret Name | Value | Dari mana? |
|-------------|-------|------------|
| `AZURE_WEBAPP_NAME` | `library-pso-api` | Nama App Service yang kamu buat |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | *isi file .PublishSettings* | Step 2.4 — copy semua isi file |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | *token dari Azure* | Step 3.2 |
| `REACT_APP_API_URL` | `https://library-pso-api.azurewebsites.net/` | URL App Service (dengan slash di akhir) |
| `MONGO_URL` | `mongodb+srv://...` | Connection string dari Step 1.4 |

> ⚠️ **Perhatian:** `AZURE_WEBAPP_PUBLISH_PROFILE` isinya panjang (XML). Paste semua isinya, jangan dipotong.

---

## BAGIAN 5: Trigger Pipeline & Verifikasi

### Step 5.1 — Trigger Pipeline

Setelah semua secret diisi, trigger pipeline dengan push sembarang ke main:

```bash
cd /Users/user/Documents/PSO-1
echo "# trigger" >> README.md
git add README.md
git commit -m "ci: trigger Azure deployment pipeline"
git push origin master
```

### Step 5.2 — Pantau Pipeline di GitHub

1. Buka https://github.com/1harbima/PSO/actions
2. Lihat workflow **"CI/CD - Library Management System"** berjalan
3. Pastikan semua 6 job berwarna **hijau ✅**

```
✅ 🧪 Backend Tests
✅ 🏗️ Frontend Build
✅ 🔍 Code Quality
✅ ☁️ Deploy Backend → Azure App Service
✅ ☁️ Deploy Frontend → Azure Static Web Apps
✅ 🚀 Deployment Summary
```

### Step 5.3 — Verifikasi App Live

Buka browser, test URL berikut:

```
# Health check backend
https://library-pso-api.azurewebsites.net/api/health
→ harus muncul: {"status":"OK","message":"..."}

# Ping
https://library-pso-api.azurewebsites.net/api/health/ping
→ harus muncul: {"pong":true}

# Frontend (URL ada di Azure Static Web App → Overview)
https://your-app.azurestaticapps.net
→ harus muncul halaman Library Management System
```

---

## Troubleshooting Umum

| Problem | Solusi |
|---------|--------|
| Pipeline gagal di "Deploy Backend" | Cek secret `AZURE_WEBAPP_PUBLISH_PROFILE` — pastikan di-copy semua |
| Backend bisa akses tapi frontend error CORS | Pastikan `REACT_APP_API_URL` di secret diisi dengan benar (ada slash di akhir) |
| MongoDB connection failed | Cek `MONGO_URL` di App Service Configuration → cek juga whitelist IP di Atlas (`0.0.0.0/0`) |
| Frontend deploy gagal | Pastikan `AZURE_STATIC_WEB_APPS_API_TOKEN` benar dan Static Web Apps sudah dibuat |
| App Service restart terus | Cek Logs di App Service → Log stream untuk lihat error Node.js |

---

## Alur Final Setelah Setup Selesai

```
Kamu edit kode
      │
      ▼
git push origin master
      │
      ▼
GitHub Actions otomatis:
  1. Test backend (Jest) ─────────────────┐
  2. Build React frontend ────────────────┤
  3. Cek struktur file ───────────────────┤
                                          │ semua lulus?
                                          ▼
  4. Deploy backend → library-pso-api.azurewebsites.net
  5. Deploy frontend → your-app.azurestaticapps.net
  6. Tampilkan summary ✅
```

**Total waktu pipeline: ~5–10 menit per push**

---

> Dibuat untuk project PSO-1 — Library Management System
> Azure for Students | MongoDB Atlas Free | GitHub Actions
