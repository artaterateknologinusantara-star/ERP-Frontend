> Roadmap ini mencakup evolusi **Finance/Accounting** Syntera ERP — dari kondisi sekarang (operational tracking, lihat `02_ACCOUNTING_MODULE_PROPOSAL.md` bagian Gap Analysis) menuju sistem akuntansi double-entry penuh, termasuk modul baru **Expense Management** (OPEX). Prioritas non-Finance (celah otorisasi, Project Management frontend, Export Excel, dll) tetap dilacak terpisah di `00_PROJECT_STATUS.md` bagian "Next Recommended Priorities" — tidak diduplikasi di sini.
>
> Sumber acuan fase Accounting: `02_ACCOUNTING_MODULE_PROPOSAL.md` bagian 5 ("Rencana Implementasi Bertahap", Fase 0-6). Dokumen ini menyusun ulang fase-fase itu (lihat bagian "Catatan" di bawah untuk riwayat penomoran ulang).
>
> **Fase 0-6 (fondasi Accounting/GL) sudah SELESAI SEMUA** — buku besar berjenjang, auto-posting AR/AP/Costing/AP Invoice/Expense, dan laporan keuangan formal, semuanya sudah teruji end-to-end di database development sungguhan, termasuk Neraca yang balance sempurna (Selisih Rp0). Detail per fase ada di bawah. Track lanjutan ada di bagian "Antrian Jangka Panjang".

# Development Roadmap — Finance & Accounting

## Fase 0 — TaxRate terpusat + CompanySettingsController
**Status: ✅ Selesai**

- Entity `TaxRate` (menggantikan PPN 11% yang sebelumnya hardcode 4x di `SalesOrderService`/`InvoiceService`), diakses lewat `ITaxRateService`.
- `CompanySettingsController` (GET/PUT) untuk entity `CompanySettings` yang sudah ter-seed tapi sebelumnya tanpa endpoint.
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 0: TaxRate terpusat + CompanySettingsController`.

## Fase 1 — Chart of Accounts + Journal Entry
**Status: ✅ Selesai**

- Tabel `Account` (COA berjenjang), `JournalEntry`, `JournalEntryLine`.
- Seed COA default (Kas & Bank, Piutang Usaha, Persediaan, Aset Tetap, Utang Usaha, Utang Pajak, Modal, Pendapatan Penjualan, HPP, Beban Operasional).
- Endpoint CRUD `Account` + create `JournalEntry` manual (untuk adjusting entries), termasuk `Reverse` (jurnal pembalik) dan `GetTrialBalanceAsync`.
- Belum ada auto-posting dari modul lain di fase ini — fondasi murni, sudah dites independen (validasi balance, reverse, trial balance) sebelum Fase 2 mulai.
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 1: Chart of Accounts + Journal Entry - GL foundation`.

## Fase 2 — Auto-posting AR/AP (Invoice, Cash In/Out, PO Payment)
**Status: ✅ Selesai**

- Hook `IJournalPostingService` (via method `PostAsync`, resolve Account by Code) di `InvoiceService.CreateAsync` (Invoice AR diterbitkan) dan `InvoiceService.RecordPaymentAsync` (Cash In) — **tidak ada `CashTransactionService`/`POPaymentService` terpisah**, Cash Out adalah method `PurchaseOrderService.RecordPaymentAsync`.
- Ketiga method di atas diubah dari `SaveChangesAsync` tunggal jadi eksplisit `Database.BeginTransactionAsync`/`CommitAsync` — posting jurnal dan operasi bisnis asli rollback bersama kalau salah satu gagal.
- Trial Balance & Buku Besar mulai terisi dari transaksi nyata.
- **Limitation terdokumentasi**: semua Cash In/Out diposting rata ke akun Kas (1-1001) karena `Payment.Method`/`POPayment.Method` tidak menyimpan info bank spesifik.
- **Prasyarat untuk Fase 5 (Expense Management)** — Expense Management memakai pola posting yang identik, jadi `IJournalPostingService` harus sudah terbukti bekerja di modul AR/AP dulu sebelum direplikasi ke Expense.
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 2: Auto-posting jurnal dari Invoice, Cash In, PO Payment ke General Ledger`.

## Fase 3 — Inventory Costing (Moving Average)
**Status: ✅ Selesai**

- Tambah `CurrentAverageCost` ke `ItemMaster` (migrasi data satu-kali: starting point = `PurchasePrice` existing, default 0 kalau null).
- Hook di `PurchaseOrderService.ReceiveGoodsAsync` (Stock In dari PO — hitung Moving Average, posting Debit Persediaan/Kredit Utang Usaha) dan `InventoryService.ConfirmDeliveryOrderAsync` (Stock Out — COGS = Qty × CurrentAverageCost dibekukan saat konfirmasi, posting Debit HPP/Kredit Persediaan).
- `ReceiveGoodsAsync` diubah jadi eksplisit transaction (pola sama seperti Fase 2); `ConfirmDeliveryOrderAsync` sudah pakai transaction sejak sebelumnya, posting COGS dimasukkan ke transaction yang sama.
- **Limitation terdokumentasi**: item PO tanpa `ItemMasterId` (nama barang bebas) dilewati dari cost tracking & posting GL — lihat `00_PROJECT_STATUS.md` Known Gaps.
- **Terverifikasi**: retest skenario PO Payment Fase 2 setelah ada Stock In membuktikan saldo Utang Usaha sekarang normal di sisi Kredit (gap Fase 2 tertutup); nilai Persediaan di GL cocok persis dengan valuasi fisik stok.
- Tidak bergantung pada Fase 4/5 (SupplierInvoice/Expense Management) — Costing dikerjakan lebih dulu karena lebih mendesak untuk akurasi HPP/Utang Usaha yang sudah aktif dipakai sejak Fase 2.
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 3: Inventory Costing Moving Average + posting HPP dan Utang Usaha saat Stock In/Out`.

## Fase 4 — SupplierInvoice (AP Invoice mandiri)
**Status: ✅ Selesai**

- Entity `SupplierInvoice` + `SupplierInvoiceItem` (line item, tracking `InvoicedQty` di `PurchaseOrderItem` mirip pola `ReceivedQty`) + `SupplierInvoicePayment` (bridge table murni, menghubungkan ke `POPayment` tanpa duplikasi logic pembayaran).
- **Keputusan desain (Pilihan B)**: akun perantara GRNI ("1-3500 Barang Diterima Belum Ditagih") ditambahkan ke COA. `PurchaseOrderService.ReceiveGoodsAsync` (Stock In, Fase 3) direvisi supaya posting ke GRNI (bukan langsung Utang Usaha), lalu `SupplierInvoiceService.ApproveAsync` yang mereklas GRNI → Utang Usaha (Debit GRNI+PPN Masukan, Kredit Utang Usaha) — mencegah double-crediting Utang Usaha antara Stock In dan SupplierInvoice.
- Endpoint pembayaran PO lama (`POST /purchase-orders/{id}/payments`) ditambah validasi: menolak pembayaran langsung kalau PO sudah punya SupplierInvoice aktif, mengarahkan ke endpoint pembayaran SupplierInvoice.
- **Bug ditemukan & diperbaiki saat testing**: validasi cap pembayaran awalnya memakai `po.Total` di titik kode yang juga dipakai jalur SupplierInvoice, padahal `SupplierInvoice.Total` (termasuk PPN) bisa lebih besar dari `po.Total` (PO tidak punya konsep pajak) — validasi cap dipindah supaya hanya berlaku di jalur pembayaran PO langsung.
- **Di luar scope**: rekonsiliasi PPN Masukan (pajak masukan dicatat tapi belum ada laporan/rekonsiliasi khusus).
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 4: SupplierInvoice (AP Invoice mandiri) + revisi GRNI pada Stock In`.

## Fase 5 — Expense Management (Operational Expense / OPEX)
**Status: ✅ Selesai**

- Entity `ExpenseCategory` (17 baris seed, mapping 1:1 ke akun beban 5-2001 s.d 5-2017 dari Fase 1) dan `Expense` (approval workflow Draft→Submitted→Approved/Rejected, reuse pola persis `PurchaseRequestStatus`).
- **Keputusan desain**: transisi `Rejected` bersifat FINAL (dead-end, tidak bisa balik ke Draft seperti pola PurchaseRequest) — supaya jejak audit Expense yang ditolak tetap bersih, karena Expense yang di-Approve punya efek langsung ke Kas/Bank.
- Posting jurnal terjadi di titik Approve (bukan Create): Debit akun Beban sesuai `ExpenseCategory.AccountId`, Kredit akun Kas/Bank (default "1-1001 Kas"), `SourceType = OperationalExpense`.
- Attachment (bukti pengeluaran) mengikuti pola `AttachmentPath`+`AttachmentName` dari `CustomerPO` (upload file fisik ke server), bukan field URL baru.
- PaymentMethod pakai string bebas mengikuti pola `POPayment.Method` (bukan enum `PaymentMethod` sisi AR).
- Status enum `Paid` disediakan untuk kebutuhan reimbursement masa depan tapi belum ada endpoint/trigger di fase ini — Expense yang sudah Approved sudah dianggap lunas secara cash-basis (jurnal sudah posting saat itu juga).
- **Frontend (menyusul, dikerjakan terpisah setelah Fase 6)**: halaman `/expense-category` dan `/expense`
  (list/create/detail dengan approval workflow) — lihat "Struktur Finance Nav" di bawah untuk catatan
  lengkap. Drill-down jurnal di halaman detail Expense memakai query live `GET /api/journal-entries?
  sourceId=` (parameter baru, ditambahkan minimal tanpa migration saat frontend dikerjakan).
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 5: Expense Management (Operational Expense) - Category + Approval + Auto-posting`, `Fase 5 (lanjutan): tambah filter sourceId ke JournalEntry query...`, dan `Fase 5: Frontend Expense Management - menutup gap backend-only dari Fase 5`.

## Fase 6 — Laporan Keuangan Formal
**Status: ✅ Selesai** (scope: Trial Balance/Laba Rugi/Neraca/Buku Besar — lihat catatan scope di bawah)

- Endpoint baru `ReportsController` (`/api/reports/*`): Trial Balance, Laba Rugi (Income Statement), Neraca (Balance Sheet), Buku Besar per akun (General Ledger dengan running balance) — masing-masing dengan export PDF (QuestPDF, pola sama seperti Invoice/Quotation/SalesOrder PDF).
- **Keputusan desain**: Laba Rugi & Neraca mengikutkan entri Reversed (filter `Status != Draft`, konsisten dengan `GetTrialBalanceAsync` Fase 1) — bukan cuma `Status = Posted`, supaya jurnal pembalik tidak berdiri sendiri tanpa pasangan penyeimbangnya.
- **Keputusan desain**: Neraca menambahkan baris Ekuitas terhitung otomatis "Laba Rugi Berjalan (Belum Ditutup)" (akumulasi live Revenue−Expense) — wajib ada karena sistem belum punya Period Closing. Lihat catatan lengkap + rencana migrasi ke Retained Earnings resmi di `01_ARCHITECTURE.md` bagian "Period Closing / Lock Tanggal Buku".
- Frontend: 3 halaman baru di grup menu Finance (Trial Balance/Laba Rugi/Neraca) dengan filter tanggal dan tombol Export PDF yang benar-benar berfungsi (raw-fetch-to-blob, pola sama seperti `sales-order/[id]/page.tsx`) — bukan tombol stub seperti gap yang tercatat di modul lain. Drill-down Buku Besar dari baris akun Trial Balance pakai `ERPModal`.
- **Teruji end-to-end di database development sungguhan** (bukan cuma scratch DB, karena endpoint ini read-only): Trial Balance Total Debit = Total Kredit; Neraca Selisih = Rp0 (Asset = Liability + Equity, membuktikan tidak ada bug posting GL di fase manapun sebelumnya); Buku Besar akun Kas running balance berurutan benar; ke-4 PDF export menghasilkan file valid; screenshot visual dikonfirmasi lewat Playwright.
- **Di luar scope fase ini** (berbeda dari cakupan awal "Fase 6" versi lama di dokumen ini, yang juga menyebut Cash Flow Statement & Cash/Bank Enhancement): Laporan Arus Kas (Cash Flow Statement) dan penggantian data hardcoded di `bank/page.tsx` dengan data GL nyata **belum dikerjakan** — dipindah jadi item terpisah di "Antrian Jangka Panjang" (lihat di bawah) supaya tidak hilang dari radar.
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 6: Laporan Keuangan Formal - Trial Balance, Laba Rugi, Neraca, Buku Besar (backend)` dan `Fase 6: Laporan Keuangan Formal - 3 halaman baru + drill-down Buku Besar (frontend)`.

---

## Struktur Finance Nav (kondisi aktual setelah Fase 0-6)

```
Finance
├── Dashboard
├── Accounts Receivable      (auto-posting sejak Fase 2)
├── Accounts Payable         (auto-posting sejak Fase 2, jadi entity mandiri SupplierInvoice di Fase 4)
├── Cash In / Cash Out
├── Expense Management        (Fase 5 — frontend, lihat catatan di bawah)
├── Kategori Pengeluaran       (Fase 5 — frontend, master data ExpenseCategory)
├── Bank                       (masih data hardcoded — lihat item Cash & Bank Enhancement di
│                               "Antrian Jangka Panjang", BUKAN bagian Fase 6 yang sudah selesai)
├── Finance Reports           (existing, cash-in/cash-out list)
├── Trial Balance             (BARU — Fase 6, drill-down Buku Besar per akun)
├── Laba Rugi                 (BARU — Fase 6)
└── Neraca                    (BARU — Fase 6)
```

**Gap frontend Expense Management — SUDAH TERTUTUP.** Sebelumnya dicatat di sini bahwa Fase 5 backend-nya
lengkap (`ExpenseCategoryController`/`ExpenseController`) tapi belum ada halaman frontend sama sekali.
Gap itu sudah ditutup: halaman `/expense-category` (CRUD kategori, pola ItemMasterTable) dan `/expense`
+ `/expense/buat` + `/expense/[id]` (list/create/detail dengan approval workflow, pola PurchaseRequest)
sudah ada dan teruji end-to-end. Drill-down "Jurnal yang Terbentuk" di halaman detail Expense yang sudah
Approved memakai query LIVE ke GL (`GET /api/journal-entries?sourceId=`, parameter baru yang ditambahkan
minimal tanpa migration) — bukan preview yang dihitung ulang di frontend. Lihat riwayat commit
`Fase 5 (lanjutan): tambah filter sourceId ke JournalEntry query...` dan
`Fase 5: Frontend Expense Management - menutup gap backend-only dari Fase 5`.

## Catatan

- **Riwayat penomoran ulang (2 kali)**:
  1. `02_ACCOUNTING_MODULE_PROPOSAL.md` bagian 5 aslinya Fase 0-5 (tanpa Expense Management). Waktu Expense Management ditambahkan sebagai requirement baru, ia sempat disisipkan sebagai "Fase 3" (menggeser Costing/SupplierInvoice/Laporan Keuangan masing-masing jadi Fase 4/5/6).
  2. Setelah implementasi sungguhan berjalan (Fase 0→1→2 selesai), **Inventory Costing dikerjakan lebih dulu** daripada Expense Management karena lebih mendesak untuk akurasi HPP/Utang Usaha — nomornya ditukar jadi Costing = Fase 3, Expense Management = Fase 4.
  3. Penukaran kedua (kondisi saat ini): **SupplierInvoice didahulukan dari Expense Management** — SupplierInvoice menutup gap AP yang sudah lama teridentifikasi di `00_PROJECT_STATUS.md` Known Gaps, dan risikonya (potensi double-posting dengan Fase 2, karena Fase 2 sudah auto-posting `PurchaseOrderService.RecordPaymentAsync` langsung dari `POPayment`) lebih baik diselesaikan selagi konteks Fase 2/3 masih segar. Expense Management scope-nya lebih besar (approval workflow, master data kategori, attachment) sehingga lebih cocok dikerjakan setelah AP benar-benar rapi. Nomornya ditukar jadi SupplierInvoice = Fase 4 (berikutnya dikerjakan), Expense Management = Fase 5.
  - Isi tiap fase **identik** dengan rencana sebelumnya di setiap penukaran — hanya nomornya yang berubah supaya konsisten dengan urutan implementasi/prioritas yang sebenarnya.
- Prioritas non-Finance di `00_PROJECT_STATUS.md` (celah otorisasi, kode mati `purchaseorder.service.ts`, Project Management frontend, Export Excel, RowVersion, Stock Adjustment) berjalan independen dari roadmap ini dan bisa dikerjakan kapan saja tanpa menunggu fase Finance di atas.

---

# Antrian Jangka Panjang (Belum Dikerjakan)

> Item di Track Accounting/GL Lanjutan **menunggu urutan setelah Fase 0-6 Accounting/GL selesai** (lihat di atas); item #1 (Track Purchasing) sengaja terpisah dari dependency itu dan sudah dikerjakan lebih dulu. Sisanya belum ada implementasi apa pun — dokumentasi/perencanaan saja. Urutan mencerminkan prioritas bisnis saat dokumen ini ditulis, bisa berubah kalau ada kebutuhan mendesak baru.

## Track Purchasing (terpisah dari track Accounting/GL)

### 1. Purchase Order Split per Vendor
**Status: ✅ Selesai**

**Business need**: 1 Purchase Request bisa butuh barang dari beberapa vendor berbeda sekaligus (contoh: PR untuk proyek CCTV butuh kamera dari Vendor A dan kabel fiber dari Vendor B).

**Business rule yang dipertahankan**: 1 Purchase Order tetap merujuk ke **satu** Supplier saja — fondasi pelacakan Utang Usaha per vendor yang akurat di General Ledger. Tidak ada PO dengan multiple vendor dalam satu dokumen — `PurchaseOrder`/`PurchaseOrderItem`/`POPayment`/`SupplierInvoice` (Fase 4) **tidak disentuh sama sekali** oleh perubahan ini.

**Solusi yang diimplementasikan**: 1 Purchase Request sekarang bisa menghasilkan **lebih dari satu** Purchase Order, masing-masing tetap 1:1 ke satu vendor, lewat mekanisme split per item:
- `PurchaseRequestItem.OrderedQty` (baru) — tracking qty per baris yang sudah teralokasi ke PO manapun, pola sama seperti `ReceivedQty`/`InvoicedQty`.
- `PurchaseRequestStatus.PartiallyOrdered` (baru, ditambahkan di akhir enum) — dihitung otomatis di `CreateFromPrAsync` (pola sama seperti `PurchaseOrderStatus.PartialReceive`), bukan lewat `UpdateStatusAsync` manual.
- `CreatePoFromPrRequest` sekarang punya `Items: [{PRItemId, Qty}]` (pola `ReceiveGoodsRequest`) — user pilih sebagian item PR untuk Vendor A → generate PO#1, sisa item untuk Vendor B → generate PO#2, dst, sampai semua item di PR itu sudah masuk ke salah satu PO (guard status: `Approved` atau `PartiallyOrdered`).
- Frontend (`purchase-request/[id]/page.tsx`): modal "Buat PO dari PR ini" ditambah tabel alokasi item+qty (prefill sisa), tombol muncul untuk `Approved`/`PartiallyOrdered`, tabel item ditambah kolom "Sudah di-PO"/"Sisa", section baru "Purchase Order Terkait" menampilkan semua PO hasil split.
- `ProjectController` Cost Monitoring (`GetCost`) dikonfirmasi **sudah tolerant** terhadap banyak PO per PR sejak awal (query pakai `.Contains()`+SUM, bukan asumsi 1 baris) — tidak perlu diubah, diverifikasi lewat testing SUM lintas 2 PO tetap benar.
- Teruji end-to-end (scratch DB): split ke 2 vendor, validasi qty melebihi sisa, blokir PO tambahan setelah PR fully `Ordered`, serta Stock In → SupplierInvoice → Payment independen untuk kedua PO hasil split tanpa cross-contamination.
- Gap baru ditemukan & dicatat di `00_PROJECT_STATUS.md` Known Gaps: `UpdateStatusAsync` tidak memvalidasi status di luar dictionary transisi (pra-existing, bukan regresi dari fitur ini).

Lihat detail implementasi & verifikasi di riwayat commit `Purchase Order Split per Vendor: 1 PR bisa generate banyak PO (1:1 per vendor)` dan `Purchase Order Split per Vendor: UI alokasi item multi-vendor di halaman PR`.

## Track Accounting/GL Lanjutan (setelah Fase 0-6 selesai)

> **Sistem akan dipakai untuk pelaporan resmi** (SPT PPN, laporan ke auditor/bank), bukan cuma
> pembukuan internal — ini mengubah prioritas beberapa item akuntansi di bawah dibanding item fitur
> murni. Item #2 dan #3 (Opening Balance, PPN Masukan Reconciliation) dinaikkan ke urutan paling awal
> karena keduanya prasyarat langsung untuk pelaporan resmi yang valid. Item #7 (Segregation of Duties)
> juga didorong oleh alasan yang sama — integritas laporan keuangan resmi butuh kontrol yang lebih
> ketat daripada sekadar pembukuan internal.

Prioritas berdasarkan dampak ke akurasi AR/Laba Rugi dan kesiapan pelaporan resmi (rekomendasi dari
pemilik proyek):

### 2. Opening Balance (Saldo Awal)
**Status: ✅ Selesai**

- **Business need**: perusahaan sudah beroperasi sebelum sistem ini ada. Perlu mekanisme memasukkan
  saldo Kas/Piutang/Persediaan/Utang/Modal yang sudah ada dari pembukuan lama ke GL sistem baru,
  sebagai Journal Entry pembuka (opening balance) per tanggal cut-off go-live.
- **Solusi yang diimplementasikan**: `JournalSourceType.OpeningBalance` (enum baru, tanpa migration —
  kolom `SourceType` sudah `HasConversion<string>().HasMaxLength(30)` sejak Fase 1) + endpoint khusus
  `POST /api/journal-entries/opening-balance` (`JournalEntryController.CreateOpeningBalance`).
- **Keputusan desain**: endpoint ini adalah wrapper tipis (`JournalPostingService.CreateOpeningBalanceAsync`)
  di atas `CreateManualEntryAsync` (Fase 1) — bukan duplikasi logic. Validasi "tidak boleh menyentuh akun
  Revenue/Expense" sengaja diisolasi di wrapper ini, bukan di `CreateManualEntryAsync`, supaya method
  generik itu tidak menumpuk percabangan khusus per-SourceType (pola sama seperti keputusan desain GRNI
  di Fase 4) dan supaya validasi ini tidak bisa "ketarik hilang" kalau `CreateManualEntryAsync` di-refactor
  nanti untuk keperluan lain. Pesan error menyebutkan kode akun yang bermasalah secara eksplisit.
- **Numbering**: reuse `NumberingConfig` `JOURNAL_ENTRY` yang sudah ada (Fase 1) — tidak ada
  `NumberingConfig` baru, karena Opening Balance tetaplah sebuah `JournalEntry` biasa, hanya dibedakan
  lewat `SourceType`.
- **Anti-duplikasi (soft warning, bukan hard-block)**: reuse endpoint generik `GET /api/journal-entries?
  sourceType=OpeningBalance&status=Posted` (filter yang sudah ada sejak Fase 1) — tidak ada endpoint
  backend baru untuk pengecekan ini. Frontend memanggilnya saat halaman dibuka; kalau ada entry Posted
  sebelumnya, tampilkan banner + `ConfirmModal` sebelum submit. Sengaja tidak hard-block karena revisi/
  koreksi opening balance yang legitimate harus tetap bisa dilakukan.
- **Keterbatasan diketahui (diterima sementara)**: tidak ada lock tanggal — setelah Opening Balance
  di-Posted, JE manual lain (`ManualAdjustment`) masih bisa dibuat dengan `Date` sebelum cut-off. Ditutup
  permanen nanti oleh Period Closing (item #13). Didokumentasikan di komentar kode
  (`JournalPostingService.CreateOpeningBalanceAsync`) dan `00_PROJECT_STATUS.md` Known Gaps.
- **Frontend**: halaman baru `/opening-balance` (grup nav "Accounting"), pola `useFieldArray` (react-hook-form
  + zod) direplikasi persis dari `purchase-request/buat/page.tsx`, dropdown akun per baris pakai
  `getFlatAccounts()` (`account.service.ts`, pola sama seperti dipakai di `expense/buat/page.tsx`) tanpa
  filter tipe akun (validasi Revenue/Expense sepenuhnya di backend). Panel live Total Debit/Kredit/Selisih
  mencegah submit sebelum balance.
- **Teruji end-to-end** (database development sungguhan, bukan scratch DB): (a) entry balanced 5 baris
  Asset/Liability/Equity (Rp100.000.000 debit=kredit) — Trial Balance (`/api/reports/trial-balance`) dan
  Neraca mencerminkannya dengan benar, Selisih Neraca tetap Rp0; (b) baris ke akun Revenue (`4-1000`) dan
  akun Expense (`5-1000`) masing-masing ditolak HTTP 400 dengan pesan menyebutkan kode akun; (c) Opening
  Balance kedua tetap berhasil dibuat (tidak hard-block), query anti-duplikasi mengembalikan entry pertama
  dengan benar; (d) Laba Rugi (`/api/reports/income-statement`) dites dengan rentang tanggal lebar yang
  mencakup tanggal Opening Balance — Total Revenue/Expense/Net Income identik dengan baseline sebelum
  Opening Balance dibuat, membuktikan nol kontaminasi ke P&L.

### 3. PPN Masukan Reconciliation (Rekapitulasi PPN)
**Prioritas: Tinggi**

- **Business need**: PPN Masukan sudah tercatat ke akun "2-3000 Utang Pajak Masukan" sejak Fase 4
  (`SupplierInvoice.ApproveAsync`) tapi belum ada mekanisme melacak "berapa yang sudah dikreditkan ke
  SPT pajak bulan ini". Untuk lapor SPT PPN resmi, butuh laporan yang bisa memisahkan PPN Masukan per
  periode pajak, dengan status sudah/belum dikreditkan.
- **Terkait PPN Keluaran juga** (dari akun "2-2000 Utang Pajak Keluaran", diposting dari Invoice AR)
  — idealnya 1 laporan "Rekapitulasi PPN" yang menampilkan PPN Keluaran vs PPN Masukan per periode,
  siap dicocokkan ke SPT — bukan 2 laporan terpisah yang harus direkonsiliasi manual.
- **Di luar scope Fase 4** (sudah dicatat sebagai limitation saat itu) — item ini yang menutup gap
  tersebut.

### 4. Down Payment / Uang Muka dari Customer
**Prioritas: Tinggi**

- **Business need**: bisnis project services (Network/CCTV/Fiber/Data Center) umumnya minta DP 30-50% sebelum pekerjaan dimulai.
- **Business rule**: DP yang diterima **bukan** Pendapatan pada saat diterima — harus dicatat sebagai **Liabilitas** ("Uang Muka Pelanggan" / Customer Advance) sampai barang/jasa benar-benar diserahkan (invoice final terbit). Baru saat itu Uang Muka direklas jadi Pendapatan.
- **Terkait Accounting/GL**: butuh akun baru "Uang Muka Pelanggan" di Liabilitas (COA), dan `SourceType` baru di `JournalEntry` untuk transaksi ini.

### 5. Retention / Termin Pembayaran Proyek
**Prioritas: Tinggi**

- **Business need**: umum di proyek infrastruktur — customer menahan 5-10% pembayaran sampai masa garansi/warranty selesai.
- **Business rule**: retention adalah AR yang belum bisa ditagih ("Piutang Retensi"), harus dibedakan dari AR normal supaya AR aging report tidak menyesatkan (retention bukan berarti customer telat bayar, tapi memang belum jatuh tempo sampai syarat garansi selesai).
- **Terkait erat dengan item #6 (Revenue Recognition — Percentage of Completion)**: retention biasanya
  muncul di proyek jangka panjang yang termin pembayarannya juga terkait progres pekerjaan — sebaiknya
  **didesain bersamaan** dengan item #6 saat waktunya tiba, bukan terpisah, supaya skema termin +
  pengakuan pendapatan + retensi konsisten satu sama lain.

### 6. Revenue Recognition — Percentage of Completion untuk Proyek Jangka Panjang
**Prioritas: Tinggi**

- **Business need**: saat ini Pendapatan diakui penuh saat Invoice terbit (`InvoiceService.CreateAsync`, Fase 2). Untuk proyek yang berjalan berbulan-bulan dengan termin bertahap, standar akuntansi yang lebih tepat adalah mengakui pendapatan sesuai progres pekerjaan (percentage of completion), bukan sesuai kapan invoice terbit.
- **Terkait erat dengan item #5 (Retention / Termin Pembayaran Proyek)**: **sebaiknya didesain
  bersamaan** saat waktunya tiba, bukan terpisah — lihat catatan silang di item #5.

### 7. Segregation of Duties untuk Journal Entry Manual
**Prioritas: Tinggi**

- **Business need**: saat ini siapa pun yang login bisa membuat/reverse jurnal manual (`POST /api/journal-entries`, `POST /api/journal-entries/{id}/reverse`, Fase 1) tanpa pembatasan role sama sekali. Ini titik paling rawan manipulasi laporan keuangan di sistem manapun — makin kritis karena sistem ini akan dipakai untuk pelaporan resmi (SPT, auditor, bank), bukan cuma pembukuan internal.
- **Business rule (arah desain awal)**: minimal 2 role terpisah — yang boleh membuat draft entry, dan yang boleh approve/post entry — dipisah orangnya (maker-checker). Detail alur (apakah semua jurnal manual butuh approval, atau hanya di atas nominal tertentu) belum diputuskan, akan dibahas saat item ini masuk sprint implementasi.
- **Catatan**: ini **berbeda** dari gap otorisasi granular yang sudah tercatat di `00_PROJECT_STATUS.md` Known Gaps (`GET /api/auth/users` tanpa `[Authorize]`, `SystemResetController` tanpa pembatasan role) — levelnya lebih kritis khusus untuk integritas laporan keuangan, bukan celah otorisasi umum.

### 8. Rekonsiliasi Bank
**Prioritas: Menengah**

- **Business need**: mencocokkan saldo Kas/Bank di GL vs mutasi rekening koran sungguhan. Standar minimum di semua sistem akuntansi. Tanpa ini, selisih pencatatan (biaya admin bank, dsb) tidak akan ketahuan sampai neraca sudah melenceng jauh.
- **Terkait erat dengan item #12 (Cash Flow Statement & Cash/Bank Enhancement)**: keduanya sama-sama butuh data mutasi Kas/Bank yang akurat — kemungkinan besar cocok dikerjakan berdekatan, meski scope-nya beda (rekonsiliasi vs pelaporan arus kas).

### 9. Down Payment / Uang Muka ke Supplier
**Prioritas: Menengah**

- **Business need**: sisi Purchasing, banyak vendor material juga minta DP.
- **Business rule**: DP yang dibayar ke supplier dicatat sebagai **Aset** ("Uang Muka Pembelian" / Vendor Advance), **bukan** langsung ke Persediaan atau Beban — direklas ke Persediaan/Beban saat barang/jasa benar-benar diterima.
- **Terkait Accounting/GL**: butuh akun baru "Uang Muka Pembelian" di Aset.

### 10. Credit Note / Debit Note
**Prioritas: Menengah**

- **Business need**: mekanisme resmi untuk koreksi invoice (barang dikembalikan, harga dikoreksi, diskon susulan) — supaya ada jejak audit yang jelas, bukan edit langsung ke invoice asli.
- **Business rule**: Credit Note (mengurangi AR/Pendapatan) dan Debit Note (menambah) harus jadi dokumen tersendiri yang tertaut ke invoice asal, masing-masing punya jurnal sendiri (bukan mengubah jurnal invoice asli).

### 11. Fixed Asset Register (sederhana)
**Prioritas: Rendah**

- **Business need**: akun "1-4000 Aset Tetap" sudah ada di Chart of Accounts (dari Fase 1) tapi belum ada entity yang men-track detailnya — bisnis ini pasti punya alat kerja sendiri (kamera test, tools fiber splicing, kendaraan).
- **Scope minimal**: pencatatan nilai beli, tanggal beli, umur ekonomis, dan depresiasi sederhana (garis lurus/straight-line) — **bukan** sistem fixed asset selengkap SAP (tidak perlu revaluasi, tidak perlu multi-method depresiasi).

### 12. Cash Flow Statement & Cash/Bank Enhancement
**Prioritas: Menengah**

- **Business need**: Fase 6 (selesai) hanya mencakup Trial Balance/Laba Rugi/Neraca/Buku Besar — Laporan Arus Kas (Cash Flow Statement, format Operating/Investing/Financing) dan penggantian data hardcoded di `bank/page.tsx` (lihat `00_PROJECT_STATUS.md` Known Gaps) dengan saldo nyata dari GL **belum dikerjakan**, sengaja dipisah dari Fase 6 supaya scope Fase 6 tetap fokus ke laporan inti yang wajib (Trial Balance/Laba Rugi/Neraca).
- **Terkait erat dengan endpoint yang sudah ada**: `GetGeneralLedgerAsync` (Fase 6) sudah punya semua data mentah (mutasi per akun + saldo berjalan) yang dibutuhkan Cash Flow Statement — kemungkinan besar tidak perlu query baru dari nol, cukup agregasi ulang dari akun Kas/Bank per kategori aktivitas (Operating/Investing/Financing).
- **Terkait erat dengan item #8 (Rekonsiliasi Bank)**: lihat catatan silang di item #8.

### 13. Period Closing / Lock Tanggal Buku
**Prioritas: Terakhir (penutup track Accounting/GL)**

- **Business need**: sekarang Laporan Keuangan resmi sudah ada (Fase 6, selesai), butuh mekanisme mengunci periode (misal "kunci Januari 2027") supaya tidak ada transaksi yang bisa diinput/diubah mundur ke tanggal yang sudah dilaporkan/final.
- **WAJIB disambungkan ke Fase 6**: baris Ekuitas "Laba Rugi Berjalan (Belum Ditutup)" di Neraca (`ReportsService.GetBalanceSheetAsync`) saat ini dihitung live setiap request karena belum ada proses closing. Begitu item ini dikerjakan, baris itu harus diubah jadi hasil jurnal penutup resmi ke akun Retained Earnings — detail lengkap ada di `01_ARCHITECTURE.md` bagian "Period Closing / Lock Tanggal Buku".
- **Catatan posisi**: sengaja ditaruh sebagai item **terakhir**, jadi bagian penutup dari roadmap Accounting/GL, bukan berdiri sendiri di tengah antrian.

## Explicitly Out of Scope

Item berikut **sengaja tidak dimasukkan** ke roadmap manapun — didokumentasikan di sini supaya tidak diusulkan ulang tanpa alasan jelas di kemudian hari:

- **Multi-currency** — kecuali ada kebutuhan transaksi USD/vendor luar negeri di masa depan, saat ini semua transaksi asumsi single currency (IDR).
- **Budgeting & Forecasting module** — fitur skala besar, belum relevan untuk skala bisnis saat ini.
- **3-way matching otomatis (PO-GRN-Invoice) yang strict/blocking transaksi** — kalau nanti dibutuhkan, sebaiknya jadi laporan pembanding saja (informational), bukan validasi yang menolak transaksi.
- **Multi-entity consolidation** — hanya relevan kalau ada anak perusahaan terpisah nanti.
