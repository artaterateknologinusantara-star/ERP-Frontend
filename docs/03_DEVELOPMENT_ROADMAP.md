> Roadmap ini mencakup evolusi **Finance/Accounting** Syntera ERP — dari kondisi sekarang (operational tracking, lihat `02_ACCOUNTING_MODULE_PROPOSAL.md` bagian Gap Analysis) menuju sistem akuntansi double-entry penuh, termasuk modul baru **Expense Management** (OPEX). Prioritas non-Finance (celah otorisasi, Project Management frontend, Export Excel, dll) tetap dilacak terpisah di `00_PROJECT_STATUS.md` bagian "Next Recommended Priorities" — tidak diduplikasi di sini.
>
> Sumber acuan fase Accounting: `02_ACCOUNTING_MODULE_PROPOSAL.md` bagian 5 ("Rencana Implementasi Bertahap", Fase 0-5). Dokumen ini menyusun ulang fase-fase itu (lihat bagian "Catatan" di bawah untuk riwayat penomoran ulang).

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
**Status: Belum dimulai. Ini yang dikerjakan berikutnya.**

- Entity `SupplierInvoice` + migrasi data `POPayment` lama jadi historical record.
- AP Aging report yang benar (bukan cuma agregasi pembayaran).
- **Alasan didahulukan dari Expense Management** (lihat bagian "Catatan" untuk detail): menutup gap AP yang sudah lama teridentifikasi di `00_PROJECT_STATUS.md` Known Gaps, dan risiko potensi double-posting dengan Fase 2 (auto-posting `PurchaseOrderService.RecordPaymentAsync`) lebih baik diselesaikan selagi konteks Fase 2/3 masih segar.

## Fase 5 — Expense Management (Operational Expense / OPEX)
**Status: Belum dimulai. Desain & urutan sudah dikonfirmasi final — siap jadi acuan implementasi.** Lihat detail lengkap di `01_ARCHITECTURE.md` bagian "Future Modules → Expense Management".

- Berada setelah Fase 2 (butuh pola posting jurnal `IJournalPostingService` yang sudah terbukti bekerja di AR/AP), setelah Fase 3 (Costing, dikerjakan lebih dulu karena lebih mendesak), dan setelah Fase 4 (SupplierInvoice, didahulukan karena scope-nya lebih kecil dan menutup gap AP yang sudah lama teridentifikasi — lihat bagian "Catatan"), dan sebelum Fase 6 (Laporan Keuangan Formal / Cash & Bank Enhancement) karena laporan itu harus sudah mencakup data Expense supaya lengkap.
- Modul terpisah tegas dari Purchasing — lihat aturan pemisahan di `01_ARCHITECTURE.md` bagian "Business Rules — Pemisahan Project Expense vs Operational Expense". Expense Management tidak pernah membuat Purchase Order; Purchasing tidak pernah mencatat Office Expense.
- Entity baru: `ExpenseCategory` (master data), `Expense` (transaksi: Expense No, Date, Category, Description, Vendor opsional, Amount, Payment Method, Cash/Bank Account, Reference Number, Attachment, Status, CreatedBy, ApprovedBy, Remarks).
- **Vendor pada Expense Entry — dikonfirmasi final**: `Expense.VendorId` adalah FK read-only ke tabel `Supplier` yang sudah ada di Purchasing, **bukan** tabel vendor baru. Murni informasi tambahan, tidak pernah memicu pembuatan `PurchaseRequest`/`PurchaseOrder`/entity Purchasing lain apa pun.
- Setiap `ExpenseCategory` di-mapping 1:1 ke akun anak di bawah "Beban Operasional" (mis. "5-1001 Beban Sewa Kantor" untuk kategori "Office Rent") — mapping ini butuh Fase 1 (COA) sudah ada.
- Posting saat Expense dibayar: Debit akun Beban Kategori tsb, Kredit Kas/Bank — `JournalEntry.SourceType = "OperationalExpense"` (terpisah dari `SourceType` lain seperti `PurchaseInvoice`/`StockOut`), **tidak pernah** menyentuh akun Persediaan/HPP/Project Cost.
- **Approval Expense — dikonfirmasi final**: opsional, dan **reuse pola approval Quotation/PurchaseRequest yang sudah ada** (state machine Draft → Submitted → Approved/Rejected, `ApprovedAt`/`ApprovedBy` di baris parent) — bukan alur approval baru atau entity `Approval` terpisah.
- Recurring Expenses eksplisit **future** — di luar scope fase ini.
- **Scope lebih besar dari SupplierInvoice** (approval workflow, master data kategori, attachment) — alasan tambahan kenapa didahulukan oleh SupplierInvoice yang scope-nya lebih kecil dan lebih mendesak.

## Fase 6 — Laporan Keuangan Formal & Cash & Bank Enhancement
**Status: Belum dimulai**

- Trial Balance, Laba Rugi, Neraca, Cash Flow sebagai halaman baru di Finance module — mencakup data dari **semua** fase sebelumnya termasuk SupplierInvoice (Fase 4) dan Expense Management (Fase 5).
- Halaman `bank/page.tsx` (saat ini 100% data hardcoded per `00_PROJECT_STATUS.md`) diganti data nyata dari GL — ini yang dimaksud "Cash & Bank Enhancement".
- Period closing (lock tanggal, cegah posting mundur setelah tutup buku) — lihat juga item "Period Closing / Lock Tanggal Buku" di bagian "Antrian Jangka Panjang" di bawah, yang jadi penutup resmi track ini.

---

## Struktur Finance Nav (target akhir, setelah semua fase di atas)

```
Finance
├── Dashboard
├── Accounts Receivable      (sudah ada, auto-posting sejak Fase 2)
├── Accounts Payable         (sudah ada, auto-posting sejak Fase 2, jadi entity mandiri di Fase 4)
├── Expense Management       (BARU — Fase 5)
│   ├── Expense Categories
│   ├── Expense Entry
│   ├── Expense Approval     (optional)
│   └── Expense Reports
├── Cash & Bank               (enhancement di Fase 6)
└── Reports                   (Trial Balance/Laba Rugi/Neraca/Cash Flow — Fase 6)
```

## Catatan

- **Riwayat penomoran ulang (2 kali)**:
  1. `02_ACCOUNTING_MODULE_PROPOSAL.md` bagian 5 aslinya Fase 0-5 (tanpa Expense Management). Waktu Expense Management ditambahkan sebagai requirement baru, ia sempat disisipkan sebagai "Fase 3" (menggeser Costing/SupplierInvoice/Laporan Keuangan masing-masing jadi Fase 4/5/6).
  2. Setelah implementasi sungguhan berjalan (Fase 0→1→2 selesai), **Inventory Costing dikerjakan lebih dulu** daripada Expense Management karena lebih mendesak untuk akurasi HPP/Utang Usaha — nomornya ditukar jadi Costing = Fase 3, Expense Management = Fase 4.
  3. Penukaran kedua (kondisi saat ini): **SupplierInvoice didahulukan dari Expense Management** — SupplierInvoice menutup gap AP yang sudah lama teridentifikasi di `00_PROJECT_STATUS.md` Known Gaps, dan risikonya (potensi double-posting dengan Fase 2, karena Fase 2 sudah auto-posting `PurchaseOrderService.RecordPaymentAsync` langsung dari `POPayment`) lebih baik diselesaikan selagi konteks Fase 2/3 masih segar. Expense Management scope-nya lebih besar (approval workflow, master data kategori, attachment) sehingga lebih cocok dikerjakan setelah AP benar-benar rapi. Nomornya ditukar jadi SupplierInvoice = Fase 4 (berikutnya dikerjakan), Expense Management = Fase 5.
  - Isi tiap fase **identik** dengan rencana sebelumnya di setiap penukaran — hanya nomornya yang berubah supaya konsisten dengan urutan implementasi/prioritas yang sebenarnya.
- Prioritas non-Finance di `00_PROJECT_STATUS.md` (celah otorisasi, kode mati `purchaseorder.service.ts`, Project Management frontend, Export Excel, RowVersion, Stock Adjustment) berjalan independen dari roadmap ini dan bisa dikerjakan kapan saja tanpa menunggu fase Finance di atas.

---

# Antrian Jangka Panjang (Belum Dikerjakan)

> Semua item di bawah **menunggu urutan setelah Fase 0-6 Accounting/GL selesai** (lihat di atas). Belum ada implementasi apa pun — dokumentasi/perencanaan saja. Urutan mencerminkan prioritas bisnis saat dokumen ini ditulis, bisa berubah kalau ada kebutuhan mendesak baru.

## Track Purchasing (terpisah dari track Accounting/GL)

### 1. Purchase Order Split per Vendor

**Business need**: 1 Purchase Request bisa butuh barang dari beberapa vendor berbeda sekaligus (contoh: PR untuk proyek CCTV butuh kamera dari Vendor A dan kabel fiber dari Vendor B).

**Business rule yang harus dipertahankan**: 1 Purchase Order tetap harus merujuk ke **satu** Supplier saja — ini fondasi untuk pelacakan Utang Usaha per vendor yang akurat di General Ledger. **Tidak boleh** membuat PO dengan multiple vendor dalam satu dokumen.

**Solusi**: kemampuan split — 1 Purchase Request bisa menghasilkan **lebih dari satu** Purchase Order, masing-masing PO tetap 1:1 ke satu vendor. User pilih sebagian item PR untuk Vendor A → generate PO#1, sisa item untuk Vendor B → generate PO#2, dst — sampai semua item di PR itu sudah masuk ke salah satu PO.

**Kondisi kode saat ini (dikonfirmasi, bukan asumsi)**: `PurchaseOrderService.CreateFromPrAsync` + `CreatePoFromPrRequest` (DTO) sekarang **all-or-nothing, single-shot**:
- `CreatePoFromPrRequest` tidak punya field pemilihan item sama sekali (cuma `SupplierId`, `Notes`, `DeliveryDate`).
- `CreateFromPrAsync` mengambil **semua** `pr.Items` tanpa filter, lalu langsung set `pr.Status = Ordered`.
- Karena guard method ini adalah `if (pr.Status != Approved) return null`, PR yang statusnya sudah berubah jadi `Ordered` **tidak bisa dipakai generate PO lagi** — sehingga 1 PR hanya bisa menghasilkan tepat 1 PO, sekali jalan, mengambil semua item sekaligus.
- **Kesimpulan**: gap-nya seukuran fitur baru dari nol — butuh (a) field pemilihan subset item di request, (b) tracking "item PR mana yang sudah teralokasi ke PO mana" di level item (bukan cuma status PR di level dokumen), (c) status PR baru atau logika baru untuk "Partially Ordered" vs "Ordered" (PR baru boleh full-Ordered kalau **semua** itemnya sudah masuk ke salah satu PO).

**Posisi antrian**: track terpisah dari Accounting/GL (Fase 0-6) — ini perbaikan modul Purchasing, bukan bagian Accounting, jadi tidak menunggu Fase 0-6 selesai (bisa dikerjakan paralel kalau prioritas bisnis mendesak).

## Track Accounting/GL Lanjutan (setelah Fase 0-6 selesai)

Prioritas berdasarkan dampak ke akurasi AR/Laba Rugi (rekomendasi dari pemilik proyek):

### 2. Down Payment / Uang Muka dari Customer
**Prioritas: Tinggi**

- **Business need**: bisnis project services (Network/CCTV/Fiber/Data Center) umumnya minta DP 30-50% sebelum pekerjaan dimulai.
- **Business rule**: DP yang diterima **bukan** Pendapatan pada saat diterima — harus dicatat sebagai **Liabilitas** ("Uang Muka Pelanggan" / Customer Advance) sampai barang/jasa benar-benar diserahkan (invoice final terbit). Baru saat itu Uang Muka direklas jadi Pendapatan.
- **Terkait Accounting/GL**: butuh akun baru "Uang Muka Pelanggan" di Liabilitas (COA), dan `SourceType` baru di `JournalEntry` untuk transaksi ini.

### 3. Retention / Termin Pembayaran Proyek
**Prioritas: Tinggi**

- **Business need**: umum di proyek infrastruktur — customer menahan 5-10% pembayaran sampai masa garansi/warranty selesai.
- **Business rule**: retention adalah AR yang belum bisa ditagih ("Piutang Retensi"), harus dibedakan dari AR normal supaya AR aging report tidak menyesatkan (retention bukan berarti customer telat bayar, tapi memang belum jatuh tempo sampai syarat garansi selesai).

### 4. Down Payment / Uang Muka ke Supplier
**Prioritas: Menengah**

- **Business need**: sisi Purchasing, banyak vendor material juga minta DP.
- **Business rule**: DP yang dibayar ke supplier dicatat sebagai **Aset** ("Uang Muka Pembelian" / Vendor Advance), **bukan** langsung ke Persediaan atau Beban — direklas ke Persediaan/Beban saat barang/jasa benar-benar diterima.
- **Terkait Accounting/GL**: butuh akun baru "Uang Muka Pembelian" di Aset.

### 5. Credit Note / Debit Note
**Prioritas: Menengah**

- **Business need**: mekanisme resmi untuk koreksi invoice (barang dikembalikan, harga dikoreksi, diskon susulan) — supaya ada jejak audit yang jelas, bukan edit langsung ke invoice asli.
- **Business rule**: Credit Note (mengurangi AR/Pendapatan) dan Debit Note (menambah) harus jadi dokumen tersendiri yang tertaut ke invoice asal, masing-masing punya jurnal sendiri (bukan mengubah jurnal invoice asli).

### 6. Fixed Asset Register (sederhana)
**Prioritas: Rendah**

- **Business need**: akun "1-4000 Aset Tetap" sudah ada di Chart of Accounts (dari Fase 1) tapi belum ada entity yang men-track detailnya — bisnis ini pasti punya alat kerja sendiri (kamera test, tools fiber splicing, kendaraan).
- **Scope minimal**: pencatatan nilai beli, tanggal beli, umur ekonomis, dan depresiasi sederhana (garis lurus/straight-line) — **bukan** sistem fixed asset selengkap SAP (tidak perlu revaluasi, tidak perlu multi-method depresiasi).

### 7. Period Closing / Lock Tanggal Buku
**Prioritas: Terakhir (penutup track Accounting/GL)**

- **Business need**: begitu Laporan Keuangan resmi ada (Fase 6 Accounting/GL), butuh mekanisme mengunci periode (misal "kunci Januari 2027") supaya tidak ada transaksi yang bisa diinput/diubah mundur ke tanggal yang sudah dilaporkan/final.
- **Catatan posisi**: ini terkait erat dengan Fase 6 (Financial Reports) — sengaja ditaruh sebagai item **terakhir**, jadi bagian penutup dari roadmap Accounting/GL, bukan berdiri sendiri di tengah antrian.

## Explicitly Out of Scope

Item berikut **sengaja tidak dimasukkan** ke roadmap manapun — didokumentasikan di sini supaya tidak diusulkan ulang tanpa alasan jelas di kemudian hari:

- **Multi-currency** — kecuali ada kebutuhan transaksi USD/vendor luar negeri di masa depan, saat ini semua transaksi asumsi single currency (IDR).
- **Budgeting & Forecasting module** — fitur skala besar, belum relevan untuk skala bisnis saat ini.
- **3-way matching otomatis (PO-GRN-Invoice) yang strict/blocking transaksi** — kalau nanti dibutuhkan, sebaiknya jadi laporan pembanding saja (informational), bukan validasi yang menolak transaksi.
- **Multi-entity consolidation** — hanya relevan kalau ada anak perusahaan terpisah nanti.
