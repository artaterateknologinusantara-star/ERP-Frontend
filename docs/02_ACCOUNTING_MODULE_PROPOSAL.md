**Status:** Proposal / Belum diimplementasikan
**Terkait:** [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)

> Dokumen ini mengusulkan modul **Accounting/General Ledger** yang saat ini tidak ada di Syntera ERP. Per `PROJECT_STATUS.md`, modul "Finance" yang sudah ada (Invoice, AR, AP, Cash In/Out) adalah kumpulan **laporan transaksional per-modul**, bukan sistem akuntansi double-entry. Tidak ada Chart of Accounts, tidak ada Journal Entry, tidak ada General Ledger, dan tidak ada costing method untuk inventory (FIFO/Moving Average/Standard Cost) — semua hal yang jadi tulang punggung Zoho Books, SAP FI/CO, atau QuickBooks.

---

## 1. Gap Analysis — Kenapa "Finance" yang ada sekarang bukan Accounting

| Yang dibutuhkan sistem akuntansi nyata | Kondisi Syntera saat ini |
|---|---|
| Chart of Accounts (COA) berjenjang | Tidak ada. Tidak ada entity `Account`. |
| Double-entry Journal (debit=kredit selalu balance) | Tidak ada. Invoice/POPayment/CashIn-Out murni mencatat transaksi masing-masing modul, tidak memposting ke buku besar. |
| General Ledger & Trial Balance | Tidak ada. Finance Reports adalah agregasi manual dari tabel-tabel operasional (Invoice, POPayment, CashTransaction), bukan dari GL. |
| AP Invoice sebagai entity sendiri (siklus invoice→approve→pay) | Tidak ada. AP dihitung dari `POPayment` saja — tidak ada dokumen "tagihan masuk dari vendor" yang independen dari pembayaran. |
| Costing method untuk inventory (FIFO/Avg/Standard) | Tidak ada. `ItemMaster` cuma punya `PurchasePrice`/`SellingPrice` statis, bukan moving cost per lot/transaksi. |
| Cost of Goods Sold (COGS) otomatis saat Delivery Order/Stock Out | Tidak ada. Tidak ada posting COGS ke akun manapun saat barang keluar. |
| Period closing / lock tanggal buku | Tidak ada. |
| Multi-currency / revaluation | Tidak dibahas — asumsi single currency (IDR) untuk fase awal. |
| Tax terpusat (PPN) | Hardcoded 11% di 3 tempat berbeda (`SalesOrderService` 2×, `InvoiceService` 2×) — lihat gap #6 di `PROJECT_STATUS.md`. |

Kesimpulan: modul Finance sekarang **valid sebagai operational tracking**, tapi tidak bisa menghasilkan laporan keuangan yang auditable (Neraca, Laba Rugi, Buku Besar per akun) karena tidak ada satu sumber kebenaran (GL) yang mengikat semua modul.

---

## 2. Prinsip Desain

1. **Non-destruktif terhadap modul yang sudah stabil.** Sales Order, Purchasing, Inventory, Invoice tetap jadi *source document* — modul Accounting menambahkan **lapisan posting**, bukan menggantikan alur yang sudah wired.
2. **Setiap transaksi bisnis → satu Journal Entry.** Tidak ada laporan keuangan yang dihitung langsung dari tabel operasional; semuanya dari GL.
3. **Costing dihitung di titik transaksi, bukan di laporan.** Saat stock in/out terjadi, cost per unit dihitung & dibekukan saat itu juga (seperti Zoho/SAP), bukan dihitung ulang tiap kali laporan dibuka.
4. **Idempotent & reversible.** Posting harus bisa di-reverse (jurnal pembalik), tidak boleh di-edit langsung — sama seperti prinsip akuntansi standar (no direct GL edits, only adjusting entries).

---

## 3. Struktur Data yang Diusulkan

### 3.1 Chart of Accounts

```
Account
- Id, Code (e.g. "1-1000"), Name, Type (Asset/Liability/Equity/Revenue/Expense)
- ParentAccountId (nullable, untuk hierarki: 1-1000 Kas > 1-1001 Kas BCA)
- NormalBalance (Debit/Credit)
- IsControlAccount (bool) — misal "Piutang Usaha" adalah control account yang detailnya ada di subledger AR
- IsActive
```

Seed awal minimal ala template SAK/PSAK Indonesia: Kas & Bank, Piutang Usaha, Persediaan, Aset Tetap, Utang Usaha, Utang Pajak (PPN Keluaran/Masukan), Modal, Pendapatan Penjualan, HPP, Beban Operasional.

### 3.2 Journal Entry (jantung sistem)

```
JournalEntry
- Id, EntryNumber (auto, per periode), Date, Description
- SourceType (enum: SalesInvoice, PurchaseInvoice, StockIn, StockOut, CashIn, CashOut, ManualAdjustment, Reversal)
- SourceId (FK ke dokumen asal — Invoice.Id, DeliveryOrder.Id, dll — polymorphic reference)
- Status (Draft/Posted/Reversed)
- ReversedByEntryId (nullable)
- CreatedBy, PostedAt

JournalEntryLine
- Id, JournalEntryId, AccountId, Debit, Credit, Memo
- Constraint aplikasi: SUM(Debit) per JournalEntry harus = SUM(Credit)
```

Setiap modul existing tidak menulis ke tabelnya lalu selesai — dia juga memanggil `IJournalPostingService.Post(...)` di akhir transaksi. Contoh mapping:

| Event | Debit | Kredit |
|---|---|---|
| Invoice AR diterbitkan | Piutang Usaha | Pendapatan Penjualan + PPN Keluaran |
| Pembayaran invoice diterima (Cash In) | Kas/Bank | Piutang Usaha |
| PO Payment dibayar (Cash Out) | Utang Usaha | Kas/Bank |
| Stock In dari PO (receive goods) | Persediaan | Utang Usaha (accrual) atau GRNI |
| Stock Out / Delivery Order | HPP (COGS) | Persediaan (sebesar cost yang dihitung, bukan harga jual) |

### 3.3 Inventory Costing Layer

Ini bagian yang paling sering hilang di implementasi ERP internal, dan yang membedakan "software pencatatan stok" dari "software akuntansi persediaan" ala Zoho/SAP.

```
InventoryCostLayer   (dipakai kalau pilih FIFO)
- Id, ItemMasterId, WarehouseId, ReceivedDate
- QuantityReceived, QuantityRemaining, UnitCost
- SourceStockTransactionId

-- ATAU, kalau pilih Moving Average (lebih simpel, cukup untuk ERP internal skala menengah):

ItemMaster tambahan kolom:
- CurrentAverageCost (decimal, di-update setiap stock in)
```

**Rekomendasi:** mulai dari **Moving Average Cost**, bukan FIFO. Alasan pragmatis:
- Kompleksitas implementasi jauh lebih rendah (1 kolom running-average vs tabel layer + consumption algorithm).
- SAP Business One dan Zoho Inventory keduanya menawarkan Moving Average sebagai default untuk bisnis non-manufaktur.
- FIFO baru benar-benar diperlukan kalau ada kebutuhan valuasi per-batch/kadaluarsa (tidak terlihat relevan untuk bisnis Network/CCTV/Fiber/Data Center di `PROJECT_STATUS.md`).
- FIFO bisa ditambahkan sebagai fase 2 kalau Finance minta laporan valuasi persediaan yang lebih presisi.

Formula moving average saat Stock In:
```
NewAverageCost = ((QtyLama × AvgCostLama) + (QtyMasuk × UnitCostPembelian)) / (QtyLama + QtyMasuk)
```
Saat Stock Out (Delivery Order), COGS = `Qty × CurrentAverageCost` pada saat itu, dibekukan ke `JournalEntryLine`, tidak dihitung ulang di kemudian hari.

### 3.4 AP Invoice sebagai entity mandiri

Sesuai gap yang sudah teridentifikasi di `PROJECT_STATUS.md` ("Tidak ada entity Supplier Invoice"), tambahkan:

```
SupplierInvoice
- Id, PurchaseOrderId, SupplierId, InvoiceNumber (dari vendor), InvoiceDate, DueDate
- Subtotal, PPNMasukan, Total
- Status (Draft/Approved/PartiallyPaid/Paid/Cancelled)
- (relasi many-to-many ke POPayment via SupplierInvoicePayment untuk partial payment)
```

Ini membuat AP simetris dengan AR (Invoice), dan memungkinkan aging report AP yang benar (bukan cuma agregasi pembayaran).

### 3.5 Tax Configuration terpusat

```
TaxRate
- Id, Code (e.g. "PPN11"), Rate (0.11), EffectiveFrom, EffectiveTo, AccountId (mapping ke akun PPN Keluaran/Masukan)
```
Menyelesaikan gap #6 & prioritas #6 di `PROJECT_STATUS.md` sekaligus jadi prasyarat GL posting (PPN butuh akun sendiri, bukan sekadar angka di invoice).

---

## 4. Laporan yang Baru Bisa Dihasilkan Setelah GL Ada

- **Trial Balance** — SUM(Debit)/SUM(Credit) per akun, per periode. Ini validasi otomatis: kalau tidak balance, ada bug posting.
- **Laba Rugi (Income Statement)** — Revenue accounts − Expense accounts (termasuk HPP) dalam rentang tanggal.
- **Neraca (Balance Sheet)** — Asset = Liability + Equity, snapshot per tanggal.
- **Buku Besar per Akun (General Ledger detail)** — drill-down dari Trial Balance ke tiap `JournalEntryLine`.
- **Laporan Valuasi Persediaan** — Qty × CurrentAverageCost per item, cross-check ke saldo akun Persediaan di GL.
- **AP/AR Aging** yang benar — dari `SupplierInvoice`/`Invoice` yang belum lunas, bukan dari agregasi pembayaran.

Semua laporan finance yang sekarang ada (`ReportsModule.tsx`, Finance Reports) tetap bisa dipakai untuk operational view; laporan di atas menambahkan **lapisan akuntansi resmi** di atasnya.

---

## 5. Rencana Implementasi Bertahap

Diurutkan supaya tidak mengganggu modul yang sudah stabil (~90% completion di Sales/Purchasing), dan selaras dengan prioritas yang sudah ada di `PROJECT_STATUS.md` (khususnya #3 CompanySettings dan #6 sentralisasi PPN).

**Fase 0 — Prasyarat (bisa jalan paralel dengan gap lain)**
- Buat `TaxRate` + migrasi 3 titik hardcode PPN 11% ke sini (ini prioritas #6 yang sudah ada, jadi tidak nambah kerjaan baru, cuma resequencing).
- Buat `CompanySettingsController` (prioritas #3 yang sudah ada) — dibutuhkan karena COA & fiscal year biasanya disimpan di Company Settings.

**Fase 1 — Chart of Accounts + Journal Entry (read-only dulu)**
- Tabel `Account`, `JournalEntry`, `JournalEntryLine`.
- Seed COA default.
- Endpoint CRUD Account + endpoint create JournalEntry manual (untuk adjusting entries).
- Belum ada auto-posting dari modul lain — fase ini hanya membangun fondasi & bisa dites independen.

**Fase 2 — Auto-posting dari Invoice/CashIn-Out/POPayment**
- Hook `IJournalPostingService` di `InvoiceService`, `CashTransactionService`, `POPaymentService`.
- Trial Balance & Buku Besar mulai bisa diisi dari transaksi nyata.

**Fase 3 — Inventory Costing (Moving Average)**
- Tambah `CurrentAverageCost` ke `ItemMaster`.
- Hook di Stock In (update average cost) dan Stock Out/Delivery Order (hitung COGS, posting jurnal).
- Ini yang paling berisiko — butuh backfill/migration strategy untuk stok yang sudah ada saat ini (harus tentukan starting cost, biasanya = `PurchasePrice` terakhir).

**Fase 4 — SupplierInvoice (AP Invoice mandiri)**
- Entity baru + migrasi data POPayment lama jadi historical record (tidak perlu retrofit semua, cukup mulai berlaku untuk PO baru).
- AP Aging report yang benar.

**Fase 5 — Laporan Keuangan Formal**
- Trial Balance, Laba Rugi, Neraca sebagai halaman baru di Finance module.
- Period closing (lock tanggal, cegah posting mundur setelah tutup buku).

---

## 6. Risiko & Catatan

- **Data historis tidak punya jurnal.** Semua transaksi Invoice/PO/Stock yang sudah ada sebelum Fase 2 tidak akan punya `JournalEntry`. Perlu skrip migrasi satu-kali untuk generate opening balance / retroactive posting kalau Finance butuh laporan yang mencakup data lama.
- **Tidak ada `RowVersion`/concurrency control di seluruh sistem** (sudah tercatat di `PROJECT_STATUS.md`) — `JournalEntry` numbering rawan race condition yang sama dengan `NumberingConfig`. Sebaiknya diselesaikan bersamaan (prioritas #9 yang sudah ada).
- **`CreatedBy`/`UpdatedBy` kosong secara sistemik** — akan jadi masalah lebih besar di modul Accounting karena audit trail jurnal biasanya wajib (siapa yang posting, siapa yang approve adjusting entry). Perlu diperbaiki sebelum atau bersamaan dengan Fase 1.
- **Scope yang sengaja tidak dimasukkan** di proposal ini: multi-currency, fixed asset depreciation, budgeting/forecasting, consolidation multi-entity. Ini semua fitur SAP-tier yang kemungkinan besar di luar kebutuhan bisnis IT infrastructure/project services skala Syntera saat ini — bisa direvisit kalau ada kebutuhan spesifik.
