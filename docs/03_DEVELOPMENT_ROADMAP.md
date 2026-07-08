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
- Lihat detail implementasi & verifikasi di riwayat commit `Fase 5: Expense Management (Operational Expense) - Category + Approval + Auto-posting`.

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
├── Cash In / Cash Out / Bank (Bank masih data hardcoded — lihat item Cash & Bank Enhancement di
│                              "Antrian Jangka Panjang", BUKAN bagian Fase 6 yang sudah selesai)
├── Finance Reports           (existing, cash-in/cash-out list)
├── Trial Balance             (BARU — Fase 6, drill-down Buku Besar per akun)
├── Laba Rugi                 (BARU — Fase 6)
└── Neraca                    (BARU — Fase 6)
```

**Catatan penting**: Expense Management (Fase 5) backend-nya sudah lengkap (`ExpenseCategoryController`/`ExpenseController`, approval workflow, auto-posting) tapi **belum ada halaman frontend sama sekali** — Fase 5 waktu dikerjakan scope-nya memang backend-only. Ini bukan bug atau lupa, tapi gap yang perlu diketahui: user belum bisa membuat/approve Expense lewat UI, hanya lewat API langsung. Kandidat kerjaan lanjutan yang belum masuk antrian resmi.

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

### 7. Cash Flow Statement & Cash/Bank Enhancement
**Prioritas: Menengah**

- **Business need**: Fase 6 (selesai) hanya mencakup Trial Balance/Laba Rugi/Neraca/Buku Besar — Laporan Arus Kas (Cash Flow Statement, format Operating/Investing/Financing) dan penggantian data hardcoded di `bank/page.tsx` (lihat `00_PROJECT_STATUS.md` Known Gaps) dengan saldo nyata dari GL **belum dikerjakan**, sengaja dipisah dari Fase 6 supaya scope Fase 6 tetap fokus ke laporan inti yang wajib (Trial Balance/Laba Rugi/Neraca).
- **Terkait erat dengan endpoint yang sudah ada**: `GetGeneralLedgerAsync` (Fase 6) sudah punya semua data mentah (mutasi per akun + saldo berjalan) yang dibutuhkan Cash Flow Statement — kemungkinan besar tidak perlu query baru dari nol, cukup agregasi ulang dari akun Kas/Bank per kategori aktivitas (Operating/Investing/Financing).

### 8. Period Closing / Lock Tanggal Buku
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
