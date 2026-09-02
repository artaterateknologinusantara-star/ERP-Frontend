# CLAUDE.md — Aturan Kerja Wajib untuk Sesi Claude Code

> File ini dibaca otomatis oleh Claude Code di awal sesi. Berisi aturan standing yang berlaku
> untuk SEMUA task di repo ini, tanpa kecuali — bukan saran, tapi hasil dari insiden nyata yang
> sudah pernah terjadi di project ini. Kalau ada instruksi di prompt task yang bertentangan
> dengan aturan di sini, tanyakan ke product owner dulu, jangan asumsikan aturan ini boleh
> dilonggarkan untuk kasus tertentu.

## Konteks Proyek

**Syntera ERP** (white-label: **Aruna**) — ERP untuk bisnis IT infrastructure/project services
(Network, CCTV, Fiber, Data Center). Model deployment: **1 deployment = 1 customer**, database
terisolasi per instalasi — BUKAN multi-tenant SaaS. Stack: ASP.NET Core 8 + EF Core (backend),
Next.js 15 (frontend), SQL Server, deploy di IIS.

**Sistem ini dipakai untuk pelaporan resmi** (SPT PPN, laporan ke auditor/bank) — bukan cuma
pembukuan internal. Ini menaikkan standar kehati-hatian untuk apa pun yang menyentuh
Accounting/GL, Journal Entry, atau laporan keuangan.

---

## Aturan Wajib (Non-Negotiable)

### 1. Step 0 — Investigasi dulu, jangan ubah apa pun
Task diawali sesi investigasi murni kalau diminta: baca kode, laporkan temuan MENTAH apa
adanya. JANGAN edit/create file, JANGAN jalankan migration, JANGAN susun rencana implementasi
di laporan investigasi — itu keputusan product owner setelah baca temuan, bukan bagian dari
laporan investigasi.

### 2. NumberingConfig — snapshot before/after WAJIB di SETIAP migration
Migration apa pun — **termasuk yang kelihatannya tidak menyentuh `NumberingConfig` sama
sekali** — wajib:
1. Snapshot `LastNumber` semua DocType SEBELUM apply migration.
2. Apply migration.
3. Snapshot lagi SESUDAH, bandingkan baris per baris — harus identik kalau migration tidak
   dimaksudkan mengubahnya.

Ini bukan aturan pencegahan hipotetis — regresi counter dokumen nyata sudah pernah terjadi
(Juli 2026), dan hanya ketahuan karena snapshot manual dilakukan, BUKAN dari membaca isi file
migration saja (migration Up/Down bisa terlihat konsisten satu sama lain padahal keduanya sama
salahnya dibanding state aktual database).

### 3. Scratch-database-first
Perubahan skema (migration) dan perubahan data yang mempengaruhi data live harus dites di
scratch database dulu sebelum menyentuh database development, apalagi production. Perubahan ke
production tidak pernah diterapkan tanpa validasi scratch DB dan konfirmasi eksplisit dari
product owner.

### 4. Jangan commit tanpa instruksi eksplisit
Selesai implementasi + lolos testing ≠ boleh commit. Tunggu instruksi eksplisit ("oke commit")
sebelum menjalankan `git commit` apa pun.

### 5. Multi-write yang berelasi WAJIB satu atomic transaction
Kalau satu aksi user menghasilkan lebih dari satu row yang saling terkait (contoh: SalesOrder +
Project, Invoice + JournalEntry), WAJIB dibungkus `Database.BeginTransactionAsync()` /
`CommitAsync()` — sukses bersama atau gagal bersama. JANGAN dipecah jadi multi-step save
terpisah yang bisa menyisakan data "yatim" (orphan) kalau salah satu langkah gagal setelah
langkah lain sudah permanen tersimpan. Pola atomic transaction ini sudah dipakai di 12+ lokasi
di backend (InvoiceService, PurchaseOrderService, SupplierInvoiceService, dst) — ikuti pola
yang sama, jangan menciptakan pola baru untuk kasus baru.

### 6. Cek dulu sebelum bikin baru — hindari duplikasi implementasi
Sebelum membuat komponen/modal/service baru, `grep` dulu apakah sudah ada implementasi serupa
di tempat lain di codebase — termasuk yang diakses lewat rute/halaman yang berbeda dari yang
sedang dikerjakan. Kalau sudah ada, REUSE, jangan duplikasi. (Insiden nyata: 2 implementasi
modal "Record Payment Invoice" yang identik karena tidak dicek dulu ada yang existing di tempat
lain.)

### 7. Field uang WAJIB pakai komponen `CurrencyInput`
JANGAN PERNAH pakai `<input type="number">` native untuk field bernilai uang/desimal — parsing
native rusak untuk format ribuan ala Indonesia (contoh: `"202.020.000"` di-parse native jadi
`202.02`, bukan `202020000`). Sudah terjadi berulang di banyak lokasi berbeda sebelum akhirnya
diganti semua ke `CurrencyInput`.

### 8. White-label — nol hardcode nama brand
Tidak ada nama brand apa pun ("Syntera", dll) hardcoded di output customer-facing (PDF, UI,
fallback text). Semua identitas brand lewat `CompanySettings` (CompanyName, Logo, NPWP, Bank,
DocumentPrefix) — konfigurasi per-instalasi, bukan literal di kode.

### 9. Jangan edit literal seed `CompanySettings`/`TaxRate` di `OnModelCreating` pasca go-live
Migration berikutnya akan meng-generate `UpdateData` yang menimpa nilai live yang sudah
dikustomisasi user lewat UI, kembali ke literal baru di kode. Kalau nilai default perlu diubah,
lakukan lewat API (`PUT /api/company-settings`, `PUT /api/tax-rates/{id}`), bukan lewat kode
seed.

### 10. Jangan sentuh proses dev server yang sedang berjalan
Kalau menemukan proses `dotnet run`/`next dev` sudah aktif di port tertentu (terutama yang
terhubung ke tab browser aktif), JANGAN kill/restart tanpa konfirmasi eksplisit — kemungkinan
besar itu sesi kerja aktif product owner. Kalau perlu testing yang butuh restart backend,
jalankan instance terpisah di port lain.

### 11. DocumentPrefix / white-label numbering
Perubahan `DocumentPrefix` TIDAK BOLEH mengubah `NumberingConfig` yang sudah ada — hanya
berlaku untuk `DocType` baru yang belum pernah dibuat sebelumnya.

---

## Struktur Dokumentasi Proyek (baca dulu sebelum asumsi status fitur)

| File | Isi |
|---|---|
| `00_PROJECT_STATUS.md` | Kondisi implementasi SAAT INI — apa yang sudah jalan/belum, per commit terakhir. **Sumber kebenaran soal "apakah fitur X sudah ada".** |
| `01_ARCHITECTURE.md` | Pattern, layer, business rule, relasi data. Bukan status progress. |
| `02_ACCOUNTING_MODULE_PROPOSAL.md` | Proposal awal modul Accounting/GL (dokumen historis — cek `03_DEVELOPMENT_ROADMAP.md` untuk status aktual, jangan anggap proposal ini = kondisi sekarang). |
| `03_DEVELOPMENT_ROADMAP.md` | Roadmap fase Accounting/GL (Fase 0-6) + antrian jangka panjang, dengan status ✅/belum per item. |
| `TODO_SYNTERA_ERP.md` | Queue kerja aktif/pending terkini. |

**Kalau ragu apakah suatu fitur sudah ada atau belum** (misal: "apakah CustomerPO sudah bisa
diedit nomornya?"), cek `00_PROJECT_STATUS.md` dan `03_DEVELOPMENT_ROADMAP.md` dulu sebelum
mengasumsikan belum ada dan membangun ulang dari nol. Insiden nyata: fitur "Edit No. PO
Customer" ternyata sudah ada (diakses lewat halaman Penawaran), cuma belum ada di modul
Customer PO — kalau tidak dicek dulu, berisiko dibuat modal duplikat.

---

## Build & Run

Dicek langsung dari `ERP-Backend/SynteraERP.Api/SynteraERP.Api.csproj`,
`ERP-Backend/SynteraERP.Api.Tests/SynteraERP.Api.Tests.csproj`,
`ERP-Backend/SynteraERP.Api/Properties/launchSettings.json`, dan
`ERP-Frontend/package.json` — jangan ganti port/command di bawah ini tanpa cek ulang file
sumbernya.

### Backend — `ERP-Backend/SynteraERP.Api` (ASP.NET Core 8 / .NET SDK)

```bash
# dari folder ERP-Backend/SynteraERP.Api
dotnet build
dotnet run                      # pakai profile default (http) di launchSettings.json
dotnet run --launch-profile https
```

- Profile `http`: `http://localhost:5261`
- Profile `https`: `https://localhost:7223` + `http://localhost:5261`
- Profile `IIS Express`: IIS Express applicationUrl `http://localhost:41409`, sslPort `44384`
- `ASPNETCORE_ENVIRONMENT=Development` di semua profile non-IIS-Express
- Target framework: `net8.0`

### Backend Tests — `ERP-Backend/SynteraERP.Api.Tests` (xUnit)

```bash
# dari folder ERP-Backend/SynteraERP.Api.Tests
dotnet test
```

Framework: xUnit + `Microsoft.AspNetCore.Mvc.Testing` + `Microsoft.EntityFrameworkCore.Sqlite`
(in-memory/SQLite untuk test) + `FluentAssertions`. Referensi project via `ProjectReference` ke
`SynteraERP.Api.csproj`.

### Frontend — `ERP-Frontend` (Next.js 15)

```bash
# dari folder ERP-Frontend
npm run dev          # next dev -p 4028   → http://localhost:4028
npm run start         # next dev -p 4028   → http://localhost:4028 (sama seperti "dev", BUKAN production start)
npm run build         # next build
npm run serve         # next start (menjalankan hasil build, production mode)
npm run lint           # next lint
npm run lint:fix       # next lint --fix
npm run format          # prettier --write "src/**/*.{ts,tsx,css,md,json}"
npm run type-check       # tsc --noEmit
```

- Dev server: port **4028** (`NEXT_PUBLIC_SITE_URL=http://localhost:4028` di `.env`)
- Frontend memanggil backend lewat `NEXT_PUBLIC_API_URL=http://localhost:5261/api` (di `.env`)
  — cocok dengan profile `http` backend di atas.
- Tidak ada script `test` di `package.json`. `@playwright/test` ada sebagai devDependency tapi
  tidak ada `playwright.config.*` di root frontend dan tidak ada script npm yang menjalankannya
  — belum ada test runner frontend yang aktif per kondisi repo saat ini.
