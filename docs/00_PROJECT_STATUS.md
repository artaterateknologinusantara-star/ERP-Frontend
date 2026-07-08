**Last Updated:** 2026-07-07

> Dokumen ini menjelaskan **apa yang sudah ada di code sekarang** — status implementasi, progress, modul mana yang jalan/belum, dan pekerjaan aktif. Dokumen ini **tidak** menjelaskan alasan desain, business rule, atau pattern arsitektur secara mendalam — untuk itu lihat [`ARCHITECTURE.md`](./ARCHITECTURE.md).
>
> Sumber: source code aktual per commit terakhir di `SynteraERP_Backend/SynteraERP.Api` dan `FrontEnd_Syntera/src`. Setiap klaim di dokumen ini bisa berubah begitu ada commit baru — jangan dianggap permanen.

# Project Overview

**Syntera ERP** — sistem ERP untuk bisnis IT infrastructure & project services (Network, CCTV, Fiber Optic, Data Center, dll). Cakupan modul: Quotation (penawaran bertingkat Tab→Group→Item), Sales Order, Purchasing (Purchase Request→Purchase Order), Inventory (stock in/out, delivery order), Finance (Invoice, AR/AP, Cash In/Out), Project Management, dan Master Data (Customer, Supplier, Item Master). UI berbahasa Indonesia. Versi/nomor rilis: **Not detected** (tidak ada file `VERSION`/tag rilis di repo).

# Module Implementation Status

| Modul | Status | Completion | Ringkasan |
|---|---|---|---|
| **Authentication** | ✅ Completed | ~90% | Login nyata (`POST /auth/login`, BCrypt, JWT), token disimpan di `localStorage`, auto-redirect saat 401. Tidak ada refresh-token flow (user harus login ulang tiap kadaluarsa token) dan tidak ada halaman register/forgot-password (kemungkinan memang tidak dibutuhkan untuk ERP internal). |
| **Master Data — Customer/Vendor/Item Master** | ✅ Completed | ~90% | CRUD penuh dan terhubung API nyata di ketiganya (`customer.service.ts`, `supplier.service.ts`, `itemmaster.service.ts`), termasuk stats dan export CSV di Item Master. Gap kecil: `CustomerSummaryCards.tsx` dan `VendorSummaryCards.tsx` masih angka hardcoded, bukan dari API. |
| **Quotation** (`buat-penawaran-baru`, `riwayat-penawaran`) | ✅ Completed (inti) | ~85% | Alur penuh: buat (Tab/Group/Item), send, approve/reject, revisi, PDF preview, terima Customer PO, auto-generate Sales Order — semua wired ke API nyata. Gap: `TemplateLibraryModal.tsx` 100% mock (6 template hardcoded, tombol "Gunakan Template" tidak memuat apa pun nyata); tombol Export Excel hanya `toast.info(...)`, tidak benar-benar export. |
| **Sales** (Sales Order + Customer PO) | ✅ Completed | ~90% | List/detail/create SO, generate dari Quotation, generate PR, generate DO, generate Invoice, export PDF, panel dokumen terkait — semua wired. Tombol "Batalkan SO" ada di kode tapi sengaja dikomentari/nonaktif. |
| **Purchasing** (Purchase Request + Purchase Order) | ✅ Completed | ~90% | List/detail/create PR manual, generate PR dari SO, submit/approve/reject/reset PR, generate PO dari PR, terima barang (receive goods), catat pembayaran PO — semua wired ke API nyata. **Purchase Order Split per Vendor** (1 PR bisa menghasilkan lebih dari 1 PO, masing-masing 1:1 ke vendor berbeda) sudah selesai — lihat `03_DEVELOPMENT_ROADMAP.md` bagian "Antrian Jangka Panjang" item #1. |
| **Finance** (Invoice, AR, AP, Cash In/Out, Finance Reports, Bank) | 🚧 In Progress | ~65% | Invoice, AR, AP, Cash In/Out, dan Finance Reports memuat data nyata dari `finance.service.ts`/`invoice.service.ts`. Gap signifikan: tombol Export tidak berfungsi di hampir semua halaman finance (tanpa `onClick`); tombol "Download PDF" di detail Invoice **dinonaktifkan** dengan label "Segera hadir" padahal endpoint `GET /invoices/{id}/pdf` sudah ada dan dipakai di tempat lain; halaman `bank/page.tsx` (saldo BCA/Mandiri/BNI) 100% data hardcoded; halaman `supplier-invoice` hanya reuse komponen AP (`APSummaryCards`/`APTable`) — tidak ada entity/endpoint "Supplier Invoice" tersendiri di backend (AP murni dihitung dari `POPayment`, bukan invoice AP terpisah). Catatan: modul Accounting/GL formal (Chart of Accounts, Journal Entry, auto-posting, Trial Balance/Laba Rugi/Neraca) sudah lengkap terpisah dari tabel ini — lihat `03_DEVELOPMENT_ROADMAP.md` Fase 0-6 (✅ Selesai semua). |
| **Expense Management** (Operational Expense / OPEX) | ✅ Completed | ~90% | Modul lengkap untuk mencatat pengeluaran operasional perusahaan (sewa kantor, ATK, listrik, dll) secara terpisah tegas dari Purchasing/Project Cost — entity `ExpenseCategory`/`Expense`, approval workflow (Draft→Submitted→Approved/Rejected), auto-posting jurnal saat Approve, attachment, DAN halaman frontend (`/expense-category`, `/expense`) sudah wired ke API nyata. Lihat `03_DEVELOPMENT_ROADMAP.md` Fase 5 untuk detail implementasi lengkap (backend + frontend, dikerjakan di 2 tahap terpisah). |
| **Inventory** (Stock In, Stock Out, Warehouse) | 🚧 In Progress | ~80% | Stock In, Stock Out (Delivery Order: list/detail/create/confirm/deliver/delete), dan Warehouse (stats, low-stock alert, modal stock-in, riwayat transaksi) semua wired ke `inventory.service.ts`. **Stock Adjustment** (`/stock-adjustment`) bukan fitur nyata — halamannya hanya me-render ulang `InventorySummaryCards` + `ItemMasterTable` dari modul Item Master, tanpa transaksi adjustment khusus, meski enum `StockTransactionType.Adjustment` sudah ada di backend. |
| **Project Management** | 🚧 In Progress | ~55% | Dashboard project, list, detail (dengan cost monitoring) — semua wired ke `project.service.ts` (API backend `ProjectController` mendukung stats/CRUD/task/cost). Gap besar: tombol "Buat Project" hanya `toast.info('Form buat project baru')` — **tidak ada form create project di UI** meski `POST /projects` sudah tersedia di backend; tiga halaman satelit (`project/engineers`, `project/tasks`, `project/timeline`) 100% data mock, tidak terhubung ke entity `Project`/`ProjectTask` yang sesungguhnya; `ProjectCharts.tsx` (pie chart status) hardcoded. |
| **Reports** (sales/finance/inventory/purchasing) | ✅ Completed (inti) | ~80% | `ReportsModule.tsx` memuat stats/chart nyata lewat `Promise.allSettled` gabungan beberapa service. Gap: tombol Export tidak berfungsi. |
| **Settings** | 📋 Planned (sebagian) | ~40% | Sub-tab **Users** dan **System Administration** sepenuhnya nyata dan fungsional (lihat "Active Development" di bawah). Sub-tab **Company Profile, Branch, Roles, Tax, Numbering, Preferences** — semuanya di dalam satu komponen `SettingsModule.tsx` — murni UI mockup: data array hardcoded, tombol Simpan/Tambah/Edit/Delete **tidak punya `onClick` handler sama sekali**. Backend pun tidak punya controller untuk `CompanySettings` (lihat Known Gaps). |
| **Dashboard** | ✅ Completed (inti) | ~85% | KPI cards, tabel recent, alerts — wired ke API nyata. Gap: `StatusBarChart.tsx` ("Distribusi Status") data hardcoded, tidak mencerminkan data asli. |

# Active Development / Ongoing Refactoring

- **Pemisahan harga Item Master (SellingPrice/PurchasePrice/LastPurchasePrice)** — migrasi `ItemMasterV2_PricingSeparation` (terbaru di riwayat migrasi) menambahkan pemisahan harga jual vs harga beli plus field procurement (`Model`, `LeadTimeDays`, `VendorItemCode`, `ProcurementNotes`, `ReorderPoint`). Selesai di level schema & service (`PurchaseRequestService` sudah pakai `PurchasePrice` dengan fallback+flag verifikasi — lihat `ARCHITECTURE.md`), tapi Quotation masih pakai harga bebas per baris, belum terhubung ke `ItemMaster.SellingPrice`.
- **Integrasi Item Master ↔ Purchasing** — migrasi `AddItemMasterIdToPRAndPOItems` (migrasi paling akhir) menambahkan FK `ItemMasterId` ke baris PR dan PO. Ini melengkapi rantai stok: PR/PO kini bisa terhubung balik ke Item Master untuk update stok otomatis saat receive.
- **Modul Project Management** — modul backend penuh (migrasi `AddProjectManagement`) sudah berjalan sejak beberapa minggu lalu, tapi integrasi frontend belum tuntas: halaman create project belum ada, dan 3 halaman satelit lama (engineers/tasks/timeline) yang dibuat sebagai mockup UI belum direkonsiliasi dengan API `Project`/`ProjectTask` yang sudah tersedia. Ini modul dengan gap implementasi terbesar saat ini.
- **AuditLog** — entity dan tabel ditambahkan (tercampur dalam migrasi pricing `ItemMasterV2_PricingSeparation`), tapi baru dipakai untuk mencatat aksi `SystemResetController` (bulk reset), belum menjadi audit trail umum lintas seluruh modul CRUD seperti field `CreatedBy`/`UpdatedBy` yang idealnya diisi di setiap mutasi.
- **Settings module** — tampak sedang dalam migrasi dari UI statis ke fungsional: 2 dari 8 sub-tab (`Users`, `System Administration`) sudah nyata, 6 sisanya masih placeholder di komponen yang sama.

# Stable vs High-Risk Modules

**Stable** (workflow inti selesai, wired end-to-end ke API nyata, tidak ada TODO kritis): Authentication (inti), Master Data (Customer/Supplier/Item Master), Quotation (alur utama), Sales Order + Customer PO, Purchasing (PR+PO), Dashboard (inti).

**High-Risk** (sedang berubah, ada gap fungsional signifikan, atau berisiko dari sisi keamanan/data):
- **Settings → System Administration**: fitur reset transaksi (`system-reset.service.ts` → `SystemResetController`) melakukan **hard delete** sungguhan (bypass soft-delete) dan **hanya membutuhkan login, tanpa pembatasan role** — endpoint ini bisa dipicu siapa pun yang punya akun aktif. Lihat detail mekanisme di `ARCHITECTURE.md` bagian Authentication & Authorization.
- **Project Management (frontend)**: create-flow belum ada, 3 halaman satelit murni mock — risiko kebingungan user karena data yang ditampilkan (engineers/tasks/timeline) tidak merepresentasikan data project yang sesungguhnya.
- **Finance / Invoice PDF & Export**: tombol PDF invoice dinonaktifkan padahal backend mendukung, berpotensi membingungkan user yang mengira fitur belum ada.
- **Numbering (`NumberingConfig`)**: tidak ada locking/concurrency control saat increment nomor dokumen — berisiko duplikasi nomor dokumen di bawah beban permintaan bersamaan (concurrent request), meski belum terkonfirmasi terjadi di produksi.
- **`src/services/purchaseorder.service.ts`** (frontend): kode mati yang memanggil endpoint tak-ada di backend — detail di Known Gaps di bawah.

# Known Gaps

- **`CompanySettings` tidak punya API endpoint sama sekali** — entity dan tabelnya ada di database (di-seed saat startup, lihat `ARCHITECTURE.md`), tapi tidak ada `CompanySettingsController` atau endpoint apa pun di backend untuk membaca/mengubahnya. Halaman Settings → Company Profile di frontend karena itu tidak mungkin tersambung ke backend sampai controller ini dibuat.
- **`purchaseorder.service.ts` memanggil endpoint yang tidak ada** di backend (`/goods-receipts`, `/purchase-requests/{id}/approve`, `/purchase-requests/{id}/reject`) — file ini sudah digantikan oleh `purchase.service.ts` yang dipakai secara aktual (lewat `PATCH /purchase-requests/{id}/status` generik), tapi file lama belum dihapus.
- **[STALE, DIKOREKSI] `SupplierInvoice` sekarang PUNYA entity/endpoint sendiri di backend** (dibuat Fase 4 — `SupplierInvoiceController`, `SupplierInvoiceService`, posting GL GRNI→Utang Usaha, sudah termasuk field `NomorFakturPajak`) — catatan lama di sini menyebut "tidak ada entity Supplier Invoice di backend" yang sudah tidak akurat sejak Fase 4. Yang MASIH benar: **frontend-nya belum pernah dibuat sama sekali** — halaman `supplier-invoice/page.tsx` cuma me-render ulang komponen AP (`APSummaryCards`/`APTable`), nol koneksi ke `POST /api/supplier-invoices`. Lihat item "Frontend Form Create SupplierInvoice" di `03_DEVELOPMENT_ROADMAP.md` bagian "Track Purchasing".
- **Field `CreatedBy`/`UpdatedBy`** ada di 16 entity (via `BaseEntity`) tapi **hampir tidak pernah diisi** oleh service manapun (hanya `UpdatedAt` yang konsisten di-set) — kolom-kolom ini secara efektif tidak terpakai/kosong terus di database.
- **Tidak ada `RowVersion`/optimistic concurrency** di satu pun entity, termasuk `NumberingConfig` yang rawan race condition saat generate nomor dokumen.
- **BUG NYATA (insiden 2026-07-08): setiap migration EF Core meregenerasi ulang seed `NumberingConfig` dengan nilai hardcode, bisa mereset counter dokumen ke nomor yang sudah lama terpakai.** Saat apply migration `AddNomorFakturPajakToInvoiceAndSupplierInvoice` (task PPN Masukan Reconciliation) ke database development, 5 baris `NumberingConfig` (INVOICE/QUOTATION/SALES_ORDER/PURCHASE_ORDER/PURCHASE_REQUEST — seed paling awal di `OnModelCreating`) ter-reset dari nilai aktual (70/151/52/22/36) ke nilai seed statis hardcode (64/148/48/19/34), karena `HasData()` untuk baris-baris itu memakai `Guid.NewGuid()` sehingga diregenerasi ulang (DeleteData+InsertData) di SETIAP migration baru, dengan `LastNumber` persis seperti tertulis di C# — bukan nilai state aktual. Terdeteksi & diperbaiki manual sebelum ada dokumen baru collide (snapshot nilai sebelum apply, apply, bandingkan lagi, verifikasi silang ke `MAX()` nomor dokumen di tabel transaksi, lalu `UPDATE` manual + verifikasi fungsional). **Root cause belum diperbaiki permanen** — lihat item roadmap prioritas tinggi "NumberingConfig HasData" di `03_DEVELOPMENT_ROADMAP.md` bagian "Track Accounting/GL Lanjutan". Risiko ini berlaku untuk SEMUA migration baru di masa depan, tidak spesifik ke PPN Reconciliation.
- Banyak tombol **Export (Excel)** tersebar di berbagai modul (Finance, Reports, AR, AP, Quotation History) yang tidak punya handler sama sekali — backend pun tidak mengimplementasikan export Excel (hanya PDF via QuestPDF untuk Quotation/SalesOrder/Invoice).
- **`GET /api/auth/users`** tidak diproteksi `[Authorize]` — celah keamanan (detail di `ARCHITECTURE.md`).
- **Saldo Utang Usaha di General Ledger bisa tidak akurat untuk PO yang mengandung item tanpa `ItemMasterId`** (item nama bebas) — sisi Kredit (Stock In) tidak mencakup item tersebut, sementara sisi Debit (PO Payment) mencakup total pembayaran penuh. Perbaikan permanen butuh mewajibkan `ItemMasterId` di semua baris PO — di luar scope Fase 3.
- **`PurchaseRequestService.UpdateStatusAsync` tidak memvalidasi status yang tidak terdaftar di dictionary transisi** (termasuk `Ordered` dan `PartiallyOrdered`) — user bisa PATCH manual ke status apapun tanpa validasi. Ini gap pra-existing (bukan regresi dari PO Split), sejenis dengan gap otorisasi granular yang sudah tercatat sebelumnya. Perlu diperbaiki bersamaan kalau ada inisiatif hardening validasi status di masa depan.
- **Antrian fitur masa depan** (PPN Masukan Reconciliation, Down Payment Customer/Supplier, Retention, Revenue Recognition, Segregation of Duties JE Manual, Rekonsiliasi Bank, Credit/Debit Note, Fixed Asset Register, Cash Flow Statement & Cash/Bank Enhancement, Period Closing) — belum ada implementasi apa pun, murni perencanaan. Lihat `03_DEVELOPMENT_ROADMAP.md` bagian "Antrian Jangka Panjang" untuk detail lengkap, prioritas, dan dependency.
- **Opening Balance tidak punya lock tanggal** — `CreateOpeningBalanceAsync` (`JournalPostingService.cs`) menolak baris ke akun Revenue/Expense, tapi setelah Opening Balance di-Posted, siapa pun tetap bisa membuat Journal Entry manual lain (`ManualAdjustment`) dengan `Date` sebelum tanggal cut-off Opening Balance — tidak ada validasi yang mencegahnya. Integritas cut-off saat ini murni bergantung pada disiplin pengguna. Ini keterbatasan yang diterima sementara, akan ditutup permanen oleh Period Closing (`03_DEVELOPMENT_ROADMAP.md` item #13).
- **Sistem ditujukan untuk pelaporan resmi** (SPT PPN, laporan ke auditor/bank), bukan cuma pembukuan internal — ini mengubah prioritas beberapa item di antrian fitur masa depan di atas. Opening Balance dan PPN Masukan Reconciliation dinaikkan ke urutan paling awal (Opening Balance eksplisit **wajib selesai sebelum go-live**), dan Segregation of Duties untuk Journal Entry Manual ditambahkan sebagai item baru berprioritas tinggi karena kontrol maker-checker jadi lebih kritis begitu laporan keuangan dipakai pihak eksternal. Detail lengkap di `03_DEVELOPMENT_ROADMAP.md` bagian "Track Accounting/GL Lanjutan".

# Overall Completion

**Estimasi keseluruhan: ~75%** — modul transaksi inti (Quotation→SalesOrder→Purchasing→Inventory→Invoice, siklus utama bisnis) sudah lengkap dan wired end-to-end ke backend nyata. Yang menahan angka ini lebih tinggi: Settings (60% masih mock), Project Management frontend (banyak bagian belum terhubung), dan fitur Export yang konsisten belum berfungsi di seluruh sistem.

| Modul | Completion |
|---|---|
| Authentication | 90% |
| Master Data | 90% |
| Quotation | 85% |
| Sales | 90% |
| Purchasing | 90% |
| Finance | 65% |
| Inventory | 80% |
| Project Management | 55% |
| Reports | 80% |
| Settings | 40% |
| Dashboard | 85% |

# Next Recommended Priorities

Urutan berdasarkan dependency dan risiko, bukan sekadar mudah-ke-sulit:

1. **Tutup celah otorisasi** — tambahkan `[Authorize]` ke `GET /api/auth/users`, tambahkan pembatasan role ke `SystemResetController` (endpoint hard-delete database penuh), pindahkan JWT signing key dari `appsettings.json` ke secret store/env var.
2. **Bersihkan kode mati/patah** — hapus atau perbaiki `purchaseorder.service.ts` (memanggil 3 endpoint yang tidak ada di backend) sebelum ada yang tidak sengaja mengimpornya lagi.
3. **Buat `CompanySettingsController`** — entity dan seed data sudah ada di database, tinggal expose CRUD-nya; ini prasyarat sebelum tab Settings → Company Profile bisa benar-benar berfungsi.
4. **Sambungkan create-flow Project di frontend** — backend `POST /projects` sudah siap, tombol "Buat Project" tinggal diarahkan ke form nyata; ini blocker utama modul Project Management.
5. **Rekonsiliasi halaman satelit Project** (`engineers`, `tasks`, `timeline`) — putuskan apakah dihubungkan ke `ProjectTask`/`User` API yang sudah ada, atau dihapus jika di luar scope.
6. **Sentralisasi tarif PPN 11%** yang saat ini hardcoded terpisah di 3 tempat (`SalesOrderService` 2×, `InvoiceService` 2×) menjadi satu sumber konfigurasi, supaya perubahan tarif pajak tidak perlu ubah banyak file.
7. **Lengkapi Settings** — sub-tab Branch, Roles, Tax, Numbering, Preferences (butuh backend endpoint baru + wiring frontend).
8. **Implementasikan Export Excel** yang nyata (atau sembunyikan tombolnya) di seluruh modul Finance/Reports/Quotation History supaya UI tidak menjanjikan fitur yang tidak ada.
9. **Tambahkan optimistic concurrency (`RowVersion`)** minimal untuk `NumberingConfig`, guna mencegah nomor dokumen duplikat di kondisi concurrent request.
10. **Fitur Stock Adjustment nyata** — pisahkan dari reuse Item Master, buat transaksi adjustment yang benar-benar menulis ke `StockTransaction` dengan `Type=Adjustment`.

---
Lihat [`ARCHITECTURE.md`](./ARCHITECTURE.md) untuk detail aturan bisnis/desain di balik setiap modul.
