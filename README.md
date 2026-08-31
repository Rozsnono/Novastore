# 🌐 NovaStore API & Admin Dashboard

The backend core of the **NovaStore** sovereign app store platform, built with **Next.js 16 (App Router)**, **TypeScript**, **MongoDB (Mongoose)**, and **WebDAV NAS** storage.

---

## 📑 Table of Contents
1. [Key Features](#-key-features)
2. [Directory Structure](#-directory-structure)
3. [Environment Configuration](#-environment-configuration)
4. [Getting Started & Development](#-getting-started--development)
5. [Chunked Upload & Storage Protocol](#-chunked-upload--storage-protocol)
6. [WebDAV Version Retention & Backup Strategy](#-webdav-version-retention--backup-strategy)
7. [Self-Hosting & Dynamic Landing Page](#-self-hosting--dynamic-landing-page)
8. [API Route Reference](#-api-route-reference)
9. [Error Reporting & Crash Logger](#-error-reporting--crash-logger)

---

## ✨ Key Features

- **Next.js 16 App Router & Serverless-Ready:** Uses `os.tmpdir()` for chunk staging, making it fully compatible with Vercel, AWS Lambda, Docker, and traditional VPS.
- **WebDAV NAS Shield:** Connects securely to Synology, QNAP, Nextcloud, TrueNAS, or Apache/Nginx WebDAV. Client devices never see or access NAS credentials directly.
- **4MB Chunked Upload Assembler:** Accepts massive APK binaries in 4MB slices and automatically stitches them in memory and `/tmp`, uploading directly to WebDAV.
- **HTTP Range Streaming:** Supports RFC 7233 byte-range streaming (`206 Partial Content`) for resilient chunked mobile downloads and pause/resume capabilities.
- **In-Memory LRU Media Cache & Fast Proxy:** Caches app icons and screenshots in memory with cache-busting query parameter support.
- **Admin Dashboard:** Dark-mode glassmorphism UI with live analytics, app creation/editing, icon replacements, screenshot management, and live error log inspection.
- **Dynamic Landing Page:** Public `/novastore.apk` download links dynamically adapt to the latest `com.novastore.app` build stored in MongoDB.

---

## 📁 Directory Structure

```
novastore-api/
├── public/
│   └── novastore.apk             # Prebuilt standalone mobile installer
├── src/
│   ├── app/
│   │   ├── admin/                # Admin UI pages (Dashboard, New App, Edit App, Logs, Login)
│   │   │   ├── apps/
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── logs/page.tsx
│   │   │   └── login/page.tsx
│   │   ├── api/                  # RESTful API Endpoints
│   │   │   ├── admin/            # Protected admin endpoints (Masterkey session required)
│   │   │   │   ├── apps/
│   │   │   │   ├── auth/
│   │   │   │   ├── logs/
│   │   │   │   └── upload/       # 4MB chunk receiver & media uploader
│   │   │   ├── apps/             # Public store endpoints (Catalog, Range download, Updates)
│   │   │   │   ├── [packageName]/
│   │   │   │   └── check-updates/
│   │   │   └── logs/             # Public crash report ingest endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx              # Public Landing Page (https://novastore.rozsnorbert.hu)
│   ├── components/               # Admin navbar, chunked uploader, media uploader, UI components
│   ├── lib/
│   │   ├── auth.ts               # Masterkey session JWT sign & verify
│   │   ├── cache.ts              # In-memory LRU media cache
│   │   ├── db.ts                 # Mongoose database connection manager
│   │   ├── models/               # MongoDB models (AppItem, SystemLog)
│   │   └── webdav.ts             # WebDAV client with version retention logic
│   └── types/                    # Shared TypeScript interfaces
└── package.json
```

---

## 🔐 Environment Configuration

Create `.env.local` inside `novastore-api/`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/novastore

# Synology / TrueNAS / Nextcloud WebDAV NAS Storage
WEBDAV_URL=https://nas.yourdomain.com/remote.php/dav/files/admin/
WEBDAV_USERNAME=admin
WEBDAV_PASSWORD=your_nas_secure_password
WEBDAV_ROOT_PATH=/novastore/apps

# Admin Dashboard Authentication
ADMIN_MASTER_KEY=NovaStoreSecret2026!
JWT_SECRET=your-secure-jwt-secret-key-32-chars-long

# Public App URL (used for proxied URLs)
NEXT_PUBLIC_APP_URL=https://novastore.rozsnorbert.hu
```

---

## ⚡ Getting Started & Development

```bash
# 1. Install dependencies
cd novastore-api
npm install

# 2. Run local development server
npm run dev
# Server will run on: http://localhost:3000

# 3. Production Build
npm run build
npm run start
```

---

## 📦 Chunked Upload & Storage Protocol

```
[Browser Admin UI]
       │
       │ 1. Slices APK into 4MB chunks
       ▼
[POST /api/admin/upload/chunk]  ───> Saved into os.tmpdir()/novastore_uploads/{uploadId}/chunk_{i}
       │
       │ 2. When all chunks received
       ▼
[POST /api/admin/upload/complete] ─> Concat chunks into single Buffer
                                  ─> Uploads to WebDAV NAS (/novastore/apps/{pkg}/apk/)
                                  ─> Cleans up /tmp directory
```

---

## 🗄 WebDAV Version Retention & Backup Strategy

Each application folder on your WebDAV NAS is organized as follows:

```
/novastore/apps/{packageName}/
├── icon.png
├── screenshots/
│   ├── screenshot_0.png
│   └── screenshot_1.png
└── apk/
    ├── app-v2.apk         <-- Current active version (served to users)
    └── backup-v1.apk      <-- Immediate previous version (automatic backup)
```

- When version `N` is uploaded, the existing active build is renamed to `backup-v{versionCode}.apk`.
- Any prior backup builds (`< N-1`) are automatically purged from the NAS to prevent storage bloat.

---

## 🔄 Self-Hosting & Dynamic Landing Page

The root web landing page (`https://novastore.rozsnorbert.hu`) dynamically queries MongoDB for `com.novastore.app`:
- Displays the current version name (e.g. `v1.1.0`) on the hero CTA button.
- Direct download button points to `/api/apps/com.novastore.app/download` or `/novastore.apk`.
- When an admin updates `com.novastore.app` in the dashboard, the landing page download updates instantly.

---

## 📡 API Route Reference

### Public Store Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/apps` | Lists all published apps (supports `?search=` and `?filter=popular\|latest`) |
| `GET` | `/api/apps/:packageName` | Returns full metadata and screenshot list for an app |
| `GET` | `/api/apps/:packageName/download` | Streams APK with `Range` header support (`206 Partial Content`) |
| `POST` | `/api/apps/:packageName/download-complete` | Atomically increments the download counter |
| `GET` | `/api/apps/:packageName/icon` | Proxied app icon with cache-busting (`?t=timestamp`) support |
| `GET` | `/api/apps/:packageName/screenshots/:index` | Proxied screenshot image |
| `POST` | `/api/apps/check-updates` | Checks an array of `[{ packageName, versionCode }]` for updates |
| `POST` | `/api/logs` | Global crash & error logger ingestion endpoint |

### Protected Admin Endpoints *(Requires Masterkey Session)*

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/admin/auth/login` | Login with masterkey, sets HTTP-only signed JWT cookie |
| `POST` | `/api/admin/auth/logout` | Clears admin session cookie |
| `GET` | `/api/admin/auth/session` | Checks current admin session validity |
| `GET` | `/api/admin/apps` | Lists all apps with internal storage paths |
| `POST` | `/api/admin/apps` | Creates a new app entry in MongoDB |
| `GET` | `/api/admin/apps/:id` | Returns single app record by MongoDB ObjectId |
| `PUT` | `/api/admin/apps/:id` | Updates app metadata, version numbers, icon, and screenshots |
| `DELETE` | `/api/admin/apps/:id` | Deletes app from MongoDB and deletes its folder from WebDAV NAS |
| `POST` | `/api/admin/upload/chunk` | Receives 4MB binary chunk into `/tmp` staging directory |
| `POST` | `/api/admin/upload/complete` | Assembles chunks, streams to WebDAV NAS, applies versioning |
| `POST` | `/api/admin/upload/media` | Uploads icon or screenshot directly to WebDAV NAS |
| `GET` | `/api/admin/logs` | Queries and filters system error logs |
| `DELETE` | `/api/admin/logs` | Clears all error logs |

---

## 🛡 Error Reporting & Crash Logger

- The mobile app and API report uncaught exceptions, network failures, and chunk errors to `POST /api/logs`.
- Admins can inspect stack traces, device metadata, package context, and timestamps directly under `/admin/logs`.
