-- ============================================================
-- ERP -- SQL Server Schema (struktur tabel saja, TANPA data)
-- Digenerate otomatis dari seluruh riwayat migration EF Core:
--   dotnet ef migrations script
-- lalu baris INSERT/UPDATE/DELETE/MERGE hasil HasData() seed dan raw SQL
-- data lainnya dihapus, supaya file ini murni struktur (CREATE TABLE /
-- INDEX / FK / CONSTRAINT / ALTER TABLE).
--
-- Source of truth SEBENARNYA tetap folder Migrations/ di
-- SynteraERP.Api/Migrations -- file ini snapshot referensi baca-saja,
-- JANGAN diedit manual. Untuk regenerate: jalankan ulang
-- 'dotnet ef migrations script' dari folder SynteraERP.Api lalu strip
-- baris data (INSERT/UPDATE/DELETE/MERGE) dari hasilnya.
--
-- Terakhir digenerate: 2026-08-10 (mencakup s.d. migration
-- AddDownPaymentCustomer)
-- ============================================================

﻿IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;

BEGIN TRANSACTION;
GO

CREATE TABLE [Customers] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(20) NOT NULL,
    [Name] nvarchar(200) NOT NULL,
    [Industry] nvarchar(max) NULL,
    [ContactPerson] nvarchar(max) NULL,
    [Phone] nvarchar(max) NULL,
    [Email] nvarchar(max) NULL,
    [Address] nvarchar(max) NULL,
    [City] nvarchar(max) NULL,
    [Npwp] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Customers] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [NumberingConfigs] (
    [Id] uniqueidentifier NOT NULL,
    [DocType] nvarchar(30) NOT NULL,
    [Prefix] nvarchar(20) NOT NULL,
    [LastNumber] int NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_NumberingConfigs] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Roles] (
    [Id] uniqueidentifier NOT NULL,
    [Name] nvarchar(50) NOT NULL,
    [Description] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Suppliers] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(20) NOT NULL,
    [Name] nvarchar(200) NOT NULL,
    [ContactPerson] nvarchar(max) NULL,
    [Phone] nvarchar(max) NULL,
    [Email] nvarchar(max) NULL,
    [Address] nvarchar(max) NULL,
    [City] nvarchar(max) NULL,
    [Npwp] nvarchar(max) NULL,
    [BankName] nvarchar(max) NULL,
    [BankAccount] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Suppliers] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL,
    [RoleId] uniqueidentifier NOT NULL,
    [Name] nvarchar(100) NOT NULL,
    [Email] nvarchar(150) NOT NULL,
    [PasswordHash] nvarchar(255) NOT NULL,
    [IsActive] bit NOT NULL,
    [LastLoginAt] datetimeoffset NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Users_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [Quotations] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(30) NOT NULL,
    [CustomerId] uniqueidentifier NOT NULL,
    [ProjectName] nvarchar(300) NOT NULL,
    [Date] date NOT NULL,
    [ValidUntil] date NOT NULL,
    [SalesId] uniqueidentifier NOT NULL,
    [Revision] int NOT NULL,
    [ParentId] uniqueidentifier NULL,
    [Status] nvarchar(20) NOT NULL,
    [Discount] decimal(5,2) NOT NULL,
    [TaxRate] decimal(5,2) NOT NULL,
    [TotalMaterial] decimal(18,2) NOT NULL,
    [TotalService] decimal(18,2) NOT NULL,
    [TotalBeforeTax] decimal(18,2) NOT NULL,
    [TaxAmount] decimal(18,2) NOT NULL,
    [GrandTotal] decimal(18,2) NOT NULL,
    [PaymentTerms] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [AdditionalNotes] nvarchar(max) NULL,
    [ApprovedAt] datetimeoffset NULL,
    [ApprovedBy] uniqueidentifier NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Quotations] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Quotations_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Quotations_Quotations_ParentId] FOREIGN KEY ([ParentId]) REFERENCES [Quotations] ([Id]),
    CONSTRAINT [FK_Quotations_Users_SalesId] FOREIGN KEY ([SalesId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [QuotationTabs] (
    [Id] uniqueidentifier NOT NULL,
    [QuotationId] uniqueidentifier NOT NULL,
    [Label] nvarchar(100) NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_QuotationTabs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_QuotationTabs_Quotations_QuotationId] FOREIGN KEY ([QuotationId]) REFERENCES [Quotations] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [SalesOrders] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(30) NOT NULL,
    [QuotationId] uniqueidentifier NULL,
    [CustomerId] uniqueidentifier NOT NULL,
    [ProjectName] nvarchar(300) NOT NULL,
    [Date] date NOT NULL,
    [DeliveryDate] date NULL,
    [SalesId] uniqueidentifier NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [Total] decimal(18,2) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_SalesOrders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SalesOrders_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_SalesOrders_Quotations_QuotationId] FOREIGN KEY ([QuotationId]) REFERENCES [Quotations] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_SalesOrders_Users_SalesId] FOREIGN KEY ([SalesId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [QuotationGroups] (
    [Id] uniqueidentifier NOT NULL,
    [TabId] uniqueidentifier NOT NULL,
    [Name] nvarchar(200) NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_QuotationGroups] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_QuotationGroups_QuotationTabs_TabId] FOREIGN KEY ([TabId]) REFERENCES [QuotationTabs] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Invoices] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(30) NOT NULL,
    [SalesOrderId] uniqueidentifier NULL,
    [CustomerId] uniqueidentifier NOT NULL,
    [InvoiceDate] date NOT NULL,
    [DueDate] date NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Paid] decimal(18,2) NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Invoices] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Invoices_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Invoices_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE SET NULL
);
GO

CREATE TABLE [PurchaseRequests] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(30) NOT NULL,
    [SalesOrderId] uniqueidentifier NULL,
    [RequestedBy] uniqueidentifier NOT NULL,
    [Date] date NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [Total] decimal(18,2) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [ApprovedAt] datetimeoffset NULL,
    [ApprovedByUserId] uniqueidentifier NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_PurchaseRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PurchaseRequests_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_PurchaseRequests_Users_RequestedBy] FOREIGN KEY ([RequestedBy]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [QuotationItems] (
    [Id] uniqueidentifier NOT NULL,
    [GroupId] uniqueidentifier NOT NULL,
    [ItemNo] nvarchar(max) NOT NULL,
    [Equipment] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NULL,
    [Manufacturer] nvarchar(max) NULL,
    [Qty] decimal(12,4) NOT NULL,
    [Unit] nvarchar(20) NOT NULL,
    [ServicePrice] decimal(18,2) NOT NULL,
    [MaterialPrice] decimal(18,2) NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_QuotationItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_QuotationItems_QuotationGroups_GroupId] FOREIGN KEY ([GroupId]) REFERENCES [QuotationGroups] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Payments] (
    [Id] uniqueidentifier NOT NULL,
    [InvoiceId] uniqueidentifier NOT NULL,
    [PaymentDate] date NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Method] nvarchar(20) NOT NULL,
    [Reference] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [RecordedBy] uniqueidentifier NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Payments_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [PurchaseOrders] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(30) NOT NULL,
    [PurchaseRequestId] uniqueidentifier NULL,
    [SupplierId] uniqueidentifier NOT NULL,
    [Date] date NOT NULL,
    [DeliveryDate] date NULL,
    [Status] nvarchar(20) NOT NULL,
    [Total] decimal(18,2) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_PurchaseOrders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PurchaseOrders_PurchaseRequests_PurchaseRequestId] FOREIGN KEY ([PurchaseRequestId]) REFERENCES [PurchaseRequests] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_PurchaseOrders_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [Suppliers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [PurchaseRequestItems] (
    [Id] uniqueidentifier NOT NULL,
    [PRId] uniqueidentifier NOT NULL,
    [ItemName] nvarchar(max) NOT NULL,
    [Qty] decimal(12,4) NOT NULL,
    [Unit] nvarchar(max) NOT NULL,
    [EstPrice] decimal(18,2) NOT NULL,
    [Notes] nvarchar(max) NULL,
    CONSTRAINT [PK_PurchaseRequestItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PurchaseRequestItems_PurchaseRequests_PRId] FOREIGN KEY ([PRId]) REFERENCES [PurchaseRequests] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [PurchaseOrderItems] (
    [Id] uniqueidentifier NOT NULL,
    [POId] uniqueidentifier NOT NULL,
    [ItemName] nvarchar(max) NOT NULL,
    [Qty] decimal(12,4) NOT NULL,
    [Unit] nvarchar(max) NOT NULL,
    [Price] decimal(18,2) NOT NULL,
    [ReceivedQty] decimal(12,4) NOT NULL,
    CONSTRAINT [PK_PurchaseOrderItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PurchaseOrderItems_PurchaseOrders_POId] FOREIGN KEY ([POId]) REFERENCES [PurchaseOrders] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_Customers_Code] ON [Customers] ([Code]);
GO

CREATE INDEX [IX_Invoices_CustomerId] ON [Invoices] ([CustomerId]);
GO

CREATE UNIQUE INDEX [IX_Invoices_No] ON [Invoices] ([No]);
GO

CREATE INDEX [IX_Invoices_SalesOrderId] ON [Invoices] ([SalesOrderId]);
GO

CREATE UNIQUE INDEX [IX_NumberingConfigs_DocType] ON [NumberingConfigs] ([DocType]);
GO

CREATE INDEX [IX_Payments_InvoiceId] ON [Payments] ([InvoiceId]);
GO

CREATE INDEX [IX_PurchaseOrderItems_POId] ON [PurchaseOrderItems] ([POId]);
GO

CREATE UNIQUE INDEX [IX_PurchaseOrders_No] ON [PurchaseOrders] ([No]);
GO

CREATE INDEX [IX_PurchaseOrders_PurchaseRequestId] ON [PurchaseOrders] ([PurchaseRequestId]);
GO

CREATE INDEX [IX_PurchaseOrders_SupplierId] ON [PurchaseOrders] ([SupplierId]);
GO

CREATE INDEX [IX_PurchaseRequestItems_PRId] ON [PurchaseRequestItems] ([PRId]);
GO

CREATE UNIQUE INDEX [IX_PurchaseRequests_No] ON [PurchaseRequests] ([No]);
GO

CREATE INDEX [IX_PurchaseRequests_RequestedBy] ON [PurchaseRequests] ([RequestedBy]);
GO

CREATE INDEX [IX_PurchaseRequests_SalesOrderId] ON [PurchaseRequests] ([SalesOrderId]);
GO

CREATE INDEX [IX_QuotationGroups_TabId] ON [QuotationGroups] ([TabId]);
GO

CREATE INDEX [IX_QuotationItems_GroupId] ON [QuotationItems] ([GroupId]);
GO

CREATE INDEX [IX_Quotations_CustomerId] ON [Quotations] ([CustomerId]);
GO

CREATE UNIQUE INDEX [IX_Quotations_No] ON [Quotations] ([No]);
GO

CREATE INDEX [IX_Quotations_ParentId] ON [Quotations] ([ParentId]);
GO

CREATE INDEX [IX_Quotations_SalesId] ON [Quotations] ([SalesId]);
GO

CREATE INDEX [IX_QuotationTabs_QuotationId] ON [QuotationTabs] ([QuotationId]);
GO

CREATE UNIQUE INDEX [IX_Roles_Name] ON [Roles] ([Name]);
GO

CREATE INDEX [IX_SalesOrders_CustomerId] ON [SalesOrders] ([CustomerId]);
GO

CREATE UNIQUE INDEX [IX_SalesOrders_No] ON [SalesOrders] ([No]);
GO

CREATE INDEX [IX_SalesOrders_QuotationId] ON [SalesOrders] ([QuotationId]);
GO

CREATE INDEX [IX_SalesOrders_SalesId] ON [SalesOrders] ([SalesId]);
GO

CREATE UNIQUE INDEX [IX_Suppliers_Code] ON [Suppliers] ([Code]);
GO

CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
GO

CREATE INDEX [IX_Users_RoleId] ON [Users] ([RoleId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [ItemMasters] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(30) NOT NULL,
    [Name] nvarchar(300) NOT NULL,
    [Category] nvarchar(100) NULL,
    [Brand] nvarchar(100) NULL,
    [Uom] nvarchar(50) NOT NULL,
    [Warehouse] nvarchar(100) NULL,
    [Stock] decimal(18,4) NOT NULL,
    [MinStock] decimal(18,4) NOT NULL,
    [Price] decimal(18,2) NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_ItemMasters] PRIMARY KEY ([Id])
);
GO

CREATE UNIQUE INDEX [IX_ItemMasters_Code] ON [ItemMasters] ([Code]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ItemMasters] ADD [Description] nvarchar(max) NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Quotations] ADD [IsLatestRevision] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

ALTER TABLE [Quotations] ADD [SentAt] datetimeoffset NULL;
GO

ALTER TABLE [Quotations] ADD [SentBy] uniqueidentifier NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_Quotations_No] ON [Quotations];
GO

CREATE UNIQUE INDEX [IX_Quotations_No_Revision] ON [Quotations] ([No], [Revision]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [CustomerPOs] (
    [Id] uniqueidentifier NOT NULL,
    [PoNo] nvarchar(50) NOT NULL,
    [QuotationId] uniqueidentifier NOT NULL,
    [PoDate] date NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [AttachmentPath] nvarchar(500) NULL,
    [AttachmentName] nvarchar(255) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_CustomerPOs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CustomerPOs_Quotations_QuotationId] FOREIGN KEY ([QuotationId]) REFERENCES [Quotations] ([Id]) ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX [IX_CustomerPOs_QuotationId] ON [CustomerPOs] ([QuotationId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [CompanySettings] (
    [Id] uniqueidentifier NOT NULL,
    [CompanyName] nvarchar(200) NOT NULL,
    [LogoPath] nvarchar(500) NULL,
    [Address] nvarchar(500) NULL,
    [Phone] nvarchar(50) NULL,
    [Email] nvarchar(150) NULL,
    [Website] nvarchar(200) NULL,
    [FooterText] nvarchar(1000) NULL,
    [SignatureName] nvarchar(100) NULL,
    [SignatureTitle] nvarchar(100) NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_CompanySettings] PRIMARY KEY ([Id])
);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Quotations] ADD [SupersededByQuotationId] uniqueidentifier NULL;
GO

CREATE INDEX [IX_Quotations_SupersededByQuotationId] ON [Quotations] ([SupersededByQuotationId]);
GO

ALTER TABLE [Quotations] ADD CONSTRAINT [FK_Quotations_Quotations_SupersededByQuotationId] FOREIGN KEY ([SupersededByQuotationId]) REFERENCES [Quotations] ([Id]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [SalesOrders] ADD [ExpectedDate] date NULL;
GO

ALTER TABLE [SalesOrders] ADD [RefQuotation] nvarchar(max) NULL;
GO

ALTER TABLE [SalesOrders] ADD [ShipTo] nvarchar(max) NULL;
GO

ALTER TABLE [SalesOrders] ADD [Terms] nvarchar(max) NULL;
GO

ALTER TABLE [Invoices] ADD [Terms] nvarchar(max) NULL;
GO

CREATE TABLE [SalesOrderItems] (
    [Id] uniqueidentifier NOT NULL,
    [SalesOrderId] uniqueidentifier NOT NULL,
    [ItemMasterId] uniqueidentifier NULL,
    [Description] nvarchar(max) NOT NULL,
    [Sku] nvarchar(max) NULL,
    [Qty] decimal(18,4) NOT NULL,
    [Uom] nvarchar(max) NOT NULL,
    [UnitPrice] decimal(18,2) NOT NULL,
    [Discount] decimal(5,2) NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [QtyShipped] decimal(18,4) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [SortOrder] int NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_SalesOrderItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SalesOrderItems_ItemMasters_ItemMasterId] FOREIGN KEY ([ItemMasterId]) REFERENCES [ItemMasters] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_SalesOrderItems_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_SalesOrderItems_ItemMasterId] ON [SalesOrderItems] ([ItemMasterId]);
GO

CREATE INDEX [IX_SalesOrderItems_SalesOrderId] ON [SalesOrderItems] ([SalesOrderId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [DeliveryOrders] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(450) NOT NULL,
    [SalesOrderId] uniqueidentifier NULL,
    [CustomerId] uniqueidentifier NULL,
    [DeliveryDate] date NOT NULL,
    [DeliveryAddress] nvarchar(max) NULL,
    [RecipientName] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [Status] nvarchar(max) NOT NULL,
    [CreatedByUserId] uniqueidentifier NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_DeliveryOrders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DeliveryOrders_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_DeliveryOrders_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_DeliveryOrders_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [StockTransactions] (
    [Id] uniqueidentifier NOT NULL,
    [ItemMasterId] uniqueidentifier NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Source] nvarchar(max) NOT NULL,
    [Qty] decimal(18,4) NOT NULL,
    [StockBefore] decimal(18,4) NOT NULL,
    [StockAfter] decimal(18,4) NOT NULL,
    [RefNo] nvarchar(max) NULL,
    [RefId] uniqueidentifier NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedByUserId] uniqueidentifier NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_StockTransactions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_StockTransactions_ItemMasters_ItemMasterId] FOREIGN KEY ([ItemMasterId]) REFERENCES [ItemMasters] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_StockTransactions_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [DeliveryOrderItems] (
    [Id] uniqueidentifier NOT NULL,
    [DeliveryOrderId] uniqueidentifier NOT NULL,
    [ItemMasterId] uniqueidentifier NOT NULL,
    [ItemName] nvarchar(max) NOT NULL,
    [Sku] nvarchar(max) NULL,
    [Qty] decimal(18,4) NOT NULL,
    [Uom] nvarchar(max) NOT NULL,
    [QtyOrdered] decimal(18,4) NOT NULL,
    [QtyPreviouslyOut] decimal(18,4) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_DeliveryOrderItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DeliveryOrderItems_DeliveryOrders_DeliveryOrderId] FOREIGN KEY ([DeliveryOrderId]) REFERENCES [DeliveryOrders] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_DeliveryOrderItems_ItemMasters_ItemMasterId] FOREIGN KEY ([ItemMasterId]) REFERENCES [ItemMasters] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_DeliveryOrderItems_DeliveryOrderId] ON [DeliveryOrderItems] ([DeliveryOrderId]);
GO

CREATE INDEX [IX_DeliveryOrderItems_ItemMasterId] ON [DeliveryOrderItems] ([ItemMasterId]);
GO

CREATE INDEX [IX_DeliveryOrders_CreatedByUserId] ON [DeliveryOrders] ([CreatedByUserId]);
GO

CREATE INDEX [IX_DeliveryOrders_CustomerId] ON [DeliveryOrders] ([CustomerId]);
GO

CREATE UNIQUE INDEX [IX_DeliveryOrders_No] ON [DeliveryOrders] ([No]);
GO

CREATE INDEX [IX_DeliveryOrders_SalesOrderId] ON [DeliveryOrders] ([SalesOrderId]);
GO

CREATE INDEX [IX_StockTransactions_CreatedByUserId] ON [StockTransactions] ([CreatedByUserId]);
GO

CREATE INDEX [IX_StockTransactions_ItemMasterId] ON [StockTransactions] ([ItemMasterId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Projects] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(30) NOT NULL,
    [Name] nvarchar(300) NOT NULL,
    [CustomerId] uniqueidentifier NOT NULL,
    [SalesOrderId] uniqueidentifier NULL,
    [ProjectManagerId] uniqueidentifier NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NULL,
    [Budget] decimal(18,2) NOT NULL,
    [Progress] int NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Projects] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Projects_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Projects_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Projects_Users_ProjectManagerId] FOREIGN KEY ([ProjectManagerId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
);
GO

CREATE TABLE [ProjectTasks] (
    [Id] uniqueidentifier NOT NULL,
    [ProjectId] uniqueidentifier NOT NULL,
    [AssignedToId] uniqueidentifier NULL,
    [Title] nvarchar(300) NOT NULL,
    [Description] nvarchar(max) NULL,
    [DueDate] date NULL,
    [Status] nvarchar(20) NOT NULL,
    [Priority] nvarchar(10) NOT NULL,
    [SortOrder] int NOT NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_ProjectTasks] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProjectTasks_Projects_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [Projects] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ProjectTasks_Users_AssignedToId] FOREIGN KEY ([AssignedToId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
);
GO

CREATE UNIQUE INDEX [IX_Projects_Code] ON [Projects] ([Code]);
GO

CREATE INDEX [IX_Projects_CustomerId] ON [Projects] ([CustomerId]);
GO

CREATE INDEX [IX_Projects_ProjectManagerId] ON [Projects] ([ProjectManagerId]);
GO

CREATE INDEX [IX_Projects_SalesOrderId] ON [Projects] ([SalesOrderId]);
GO

CREATE INDEX [IX_ProjectTasks_AssignedToId] ON [ProjectTasks] ([AssignedToId]);
GO

CREATE INDEX [IX_ProjectTasks_ProjectId] ON [ProjectTasks] ([ProjectId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [InvoiceItems] (
    [Id] uniqueidentifier NOT NULL,
    [InvoiceId] uniqueidentifier NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Sku] nvarchar(max) NULL,
    [Qty] decimal(18,4) NOT NULL,
    [Uom] nvarchar(max) NOT NULL,
    [UnitPrice] decimal(18,2) NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_InvoiceItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_InvoiceItems_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_InvoiceItems_InvoiceId] ON [InvoiceItems] ([InvoiceId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [POPayments] (
    [Id] uniqueidentifier NOT NULL,
    [PurchaseOrderId] uniqueidentifier NOT NULL,
    [PaymentDate] date NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Method] nvarchar(50) NOT NULL,
    [Reference] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_POPayments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_POPayments_PurchaseOrders_PurchaseOrderId] FOREIGN KEY ([PurchaseOrderId]) REFERENCES [PurchaseOrders] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_POPayments_PurchaseOrderId] ON [POPayments] ([PurchaseOrderId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

EXEC sp_rename N'[ItemMasters].[Price]', N'SellingPrice', N'COLUMN';
GO

ALTER TABLE [ItemMasters] ADD [IsInventoryItem] bit NOT NULL DEFAULT CAST(1 AS bit);
GO

ALTER TABLE [ItemMasters] ADD [LastPurchasePrice] decimal(18,2) NULL;
GO

ALTER TABLE [ItemMasters] ADD [LeadTimeDays] int NULL;
GO

ALTER TABLE [ItemMasters] ADD [Model] nvarchar(max) NULL;
GO

ALTER TABLE [ItemMasters] ADD [PreferredVendorId] uniqueidentifier NULL;
GO

ALTER TABLE [ItemMasters] ADD [ProcurementNotes] nvarchar(max) NULL;
GO

ALTER TABLE [ItemMasters] ADD [PurchasePrice] decimal(18,2) NULL;
GO

ALTER TABLE [ItemMasters] ADD [ReorderPoint] decimal(18,4) NULL;
GO

ALTER TABLE [ItemMasters] ADD [VendorItemCode] nvarchar(max) NULL;
GO

CREATE TABLE [AuditLogs] (
    [Id] uniqueidentifier NOT NULL,
    [Action] nvarchar(50) NOT NULL,
    [Scope] nvarchar(200) NOT NULL,
    [TotalDeleted] int NOT NULL,
    [Details] nvarchar(max) NOT NULL,
    [PerformedBy] uniqueidentifier NOT NULL,
    [PerformedByName] nvarchar(100) NOT NULL,
    [IpAddress] nvarchar(45) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
);
GO

CREATE INDEX [IX_ItemMasters_PreferredVendorId] ON [ItemMasters] ([PreferredVendorId]);
GO

ALTER TABLE [ItemMasters] ADD CONSTRAINT [FK_ItemMasters_Suppliers_PreferredVendorId] FOREIGN KEY ([PreferredVendorId]) REFERENCES [Suppliers] ([Id]) ON DELETE SET NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PurchaseRequestItems] ADD [ItemMasterId] uniqueidentifier NULL;
GO

ALTER TABLE [PurchaseOrderItems] ADD [ItemMasterId] uniqueidentifier NULL;
GO

CREATE INDEX [IX_PurchaseRequestItems_ItemMasterId] ON [PurchaseRequestItems] ([ItemMasterId]);
GO

CREATE INDEX [IX_PurchaseOrderItems_ItemMasterId] ON [PurchaseOrderItems] ([ItemMasterId]);
GO

ALTER TABLE [PurchaseOrderItems] ADD CONSTRAINT [FK_PurchaseOrderItems_ItemMasters_ItemMasterId] FOREIGN KEY ([ItemMasterId]) REFERENCES [ItemMasters] ([Id]) ON DELETE SET NULL;
GO

ALTER TABLE [PurchaseRequestItems] ADD CONSTRAINT [FK_PurchaseRequestItems_ItemMasters_ItemMasterId] FOREIGN KEY ([ItemMasterId]) REFERENCES [ItemMasters] ([Id]) ON DELETE SET NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [TaxRates] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(20) NOT NULL,
    [Name] nvarchar(100) NOT NULL,
    [Rate] decimal(6,4) NOT NULL,
    [IsDefault] bit NOT NULL,
    [EffectiveFrom] date NULL,
    [EffectiveTo] date NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_TaxRates] PRIMARY KEY ([Id])
);
GO

CREATE UNIQUE INDEX [IX_TaxRates_Code] ON [TaxRates] ([Code]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Accounts] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(20) NOT NULL,
    [Name] nvarchar(150) NOT NULL,
    [Type] nvarchar(20) NOT NULL,
    [ParentAccountId] uniqueidentifier NULL,
    [NormalBalance] nvarchar(10) NOT NULL,
    [IsControlAccount] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Accounts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Accounts_Accounts_ParentAccountId] FOREIGN KEY ([ParentAccountId]) REFERENCES [Accounts] ([Id])
);
GO

CREATE TABLE [JournalEntries] (
    [Id] uniqueidentifier NOT NULL,
    [EntryNumber] nvarchar(30) NOT NULL,
    [Date] datetimeoffset NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [SourceType] nvarchar(30) NOT NULL,
    [SourceId] uniqueidentifier NULL,
    [Status] nvarchar(20) NOT NULL,
    [ReversedByEntryId] uniqueidentifier NULL,
    [PostedAt] datetimeoffset NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_JournalEntries] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JournalEntries_JournalEntries_ReversedByEntryId] FOREIGN KEY ([ReversedByEntryId]) REFERENCES [JournalEntries] ([Id])
);
GO

CREATE TABLE [JournalEntryLines] (
    [Id] uniqueidentifier NOT NULL,
    [JournalEntryId] uniqueidentifier NOT NULL,
    [AccountId] uniqueidentifier NOT NULL,
    [Debit] decimal(18,2) NOT NULL,
    [Credit] decimal(18,2) NOT NULL,
    [Memo] nvarchar(max) NULL,
    CONSTRAINT [PK_JournalEntryLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JournalEntryLines_Accounts_AccountId] FOREIGN KEY ([AccountId]) REFERENCES [Accounts] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_JournalEntryLines_JournalEntries_JournalEntryId] FOREIGN KEY ([JournalEntryId]) REFERENCES [JournalEntries] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_Accounts_Code] ON [Accounts] ([Code]);
GO

CREATE INDEX [IX_Accounts_ParentAccountId] ON [Accounts] ([ParentAccountId]);
GO

CREATE UNIQUE INDEX [IX_JournalEntries_EntryNumber] ON [JournalEntries] ([EntryNumber]);
GO

CREATE INDEX [IX_JournalEntries_ReversedByEntryId] ON [JournalEntries] ([ReversedByEntryId]);
GO

CREATE INDEX [IX_JournalEntryLines_AccountId] ON [JournalEntryLines] ([AccountId]);
GO

CREATE INDEX [IX_JournalEntryLines_JournalEntryId] ON [JournalEntryLines] ([JournalEntryId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ItemMasters] ADD [CurrentAverageCost] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PurchaseOrderItems] ADD [InvoicedQty] decimal(12,4) NOT NULL DEFAULT 0.0;
GO

CREATE TABLE [SupplierInvoices] (
    [Id] uniqueidentifier NOT NULL,
    [No] nvarchar(30) NOT NULL,
    [InvoiceNumber] nvarchar(100) NOT NULL,
    [PurchaseOrderId] uniqueidentifier NOT NULL,
    [SupplierId] uniqueidentifier NOT NULL,
    [InvoiceDate] date NOT NULL,
    [DueDate] date NOT NULL,
    [Subtotal] decimal(18,2) NOT NULL,
    [PPNMasukan] decimal(18,2) NOT NULL,
    [Total] decimal(18,2) NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [ApprovedAt] datetimeoffset NULL,
    [ApprovedBy] uniqueidentifier NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_SupplierInvoices] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SupplierInvoices_PurchaseOrders_PurchaseOrderId] FOREIGN KEY ([PurchaseOrderId]) REFERENCES [PurchaseOrders] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_SupplierInvoices_Suppliers_SupplierId] FOREIGN KEY ([SupplierId]) REFERENCES [Suppliers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [SupplierInvoiceItems] (
    [Id] uniqueidentifier NOT NULL,
    [SupplierInvoiceId] uniqueidentifier NOT NULL,
    [PurchaseOrderItemId] uniqueidentifier NOT NULL,
    [Qty] decimal(12,4) NOT NULL,
    [Price] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_SupplierInvoiceItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SupplierInvoiceItems_PurchaseOrderItems_PurchaseOrderItemId] FOREIGN KEY ([PurchaseOrderItemId]) REFERENCES [PurchaseOrderItems] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_SupplierInvoiceItems_SupplierInvoices_SupplierInvoiceId] FOREIGN KEY ([SupplierInvoiceId]) REFERENCES [SupplierInvoices] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [SupplierInvoicePayments] (
    [Id] uniqueidentifier NOT NULL,
    [SupplierInvoiceId] uniqueidentifier NOT NULL,
    [POPaymentId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK_SupplierInvoicePayments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SupplierInvoicePayments_POPayments_POPaymentId] FOREIGN KEY ([POPaymentId]) REFERENCES [POPayments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_SupplierInvoicePayments_SupplierInvoices_SupplierInvoiceId] FOREIGN KEY ([SupplierInvoiceId]) REFERENCES [SupplierInvoices] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_SupplierInvoiceItems_PurchaseOrderItemId] ON [SupplierInvoiceItems] ([PurchaseOrderItemId]);
GO

CREATE INDEX [IX_SupplierInvoiceItems_SupplierInvoiceId] ON [SupplierInvoiceItems] ([SupplierInvoiceId]);
GO

CREATE INDEX [IX_SupplierInvoicePayments_POPaymentId] ON [SupplierInvoicePayments] ([POPaymentId]);
GO

CREATE INDEX [IX_SupplierInvoicePayments_SupplierInvoiceId] ON [SupplierInvoicePayments] ([SupplierInvoiceId]);
GO

CREATE UNIQUE INDEX [IX_SupplierInvoices_No] ON [SupplierInvoices] ([No]);
GO

CREATE INDEX [IX_SupplierInvoices_PurchaseOrderId] ON [SupplierInvoices] ([PurchaseOrderId]);
GO

CREATE UNIQUE INDEX [IX_SupplierInvoices_SupplierId_InvoiceNumber] ON [SupplierInvoices] ([SupplierId], [InvoiceNumber]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [ExpenseCategories] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(30) NOT NULL,
    [Name] nvarchar(150) NOT NULL,
    [Description] nvarchar(max) NULL,
    [AccountId] uniqueidentifier NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_ExpenseCategories] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ExpenseCategories_Accounts_AccountId] FOREIGN KEY ([AccountId]) REFERENCES [Accounts] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [Expenses] (
    [Id] uniqueidentifier NOT NULL,
    [ExpenseNo] nvarchar(30) NOT NULL,
    [ExpenseDate] date NOT NULL,
    [ExpenseCategoryId] uniqueidentifier NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [VendorId] uniqueidentifier NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Method] nvarchar(50) NOT NULL,
    [CashBankAccountId] uniqueidentifier NOT NULL,
    [ReferenceNumber] nvarchar(max) NULL,
    [AttachmentPath] nvarchar(max) NULL,
    [AttachmentName] nvarchar(max) NULL,
    [Status] nvarchar(20) NOT NULL,
    [ApprovedAt] datetimeoffset NULL,
    [ApprovedBy] uniqueidentifier NULL,
    [Remarks] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Expenses] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Expenses_Accounts_CashBankAccountId] FOREIGN KEY ([CashBankAccountId]) REFERENCES [Accounts] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Expenses_ExpenseCategories_ExpenseCategoryId] FOREIGN KEY ([ExpenseCategoryId]) REFERENCES [ExpenseCategories] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Expenses_Suppliers_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [Suppliers] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_ExpenseCategories_AccountId] ON [ExpenseCategories] ([AccountId]);
GO

CREATE UNIQUE INDEX [IX_ExpenseCategories_Code] ON [ExpenseCategories] ([Code]);
GO

CREATE INDEX [IX_Expenses_CashBankAccountId] ON [Expenses] ([CashBankAccountId]);
GO

CREATE INDEX [IX_Expenses_ExpenseCategoryId] ON [Expenses] ([ExpenseCategoryId]);
GO

CREATE UNIQUE INDEX [IX_Expenses_ExpenseNo] ON [Expenses] ([ExpenseNo]);
GO

CREATE INDEX [IX_Expenses_VendorId] ON [Expenses] ([VendorId]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [PurchaseRequestItems] ADD [OrderedQty] decimal(12,4) NOT NULL DEFAULT 0.0;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [SupplierInvoices] ADD [NomorFakturPajak] nvarchar(max) NULL;
GO

ALTER TABLE [Invoices] ADD [NomorFakturPajak] nvarchar(max) NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CompanySettings] ADD [DocumentPrefix] nvarchar(20) NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CompanySettings] ADD [BankAccountHolderName] nvarchar(100) NULL;
GO

ALTER TABLE [CompanySettings] ADD [BankAccountNumber] nvarchar(50) NULL;
GO

ALTER TABLE [CompanySettings] ADD [BankName] nvarchar(100) NULL;
GO

ALTER TABLE [CompanySettings] ADD [LogoFileName] nvarchar(255) NULL;
GO

ALTER TABLE [CompanySettings] ADD [Npwp] nvarchar(20) NULL;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Branches] (
    [Id] uniqueidentifier NOT NULL,
    [Code] nvarchar(20) NOT NULL,
    [Name] nvarchar(200) NOT NULL,
    [Address] nvarchar(500) NULL,
    [Phone] nvarchar(50) NULL,
    [Manager] nvarchar(100) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [UpdatedAt] datetimeoffset NOT NULL,
    [CreatedBy] uniqueidentifier NULL,
    [UpdatedBy] uniqueidentifier NULL,
    [IsDeleted] bit NOT NULL,
    CONSTRAINT [PK_Branches] PRIMARY KEY ([Id])
);
GO

CREATE UNIQUE INDEX [IX_Branches_Code] ON [Branches] ([Code]);
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [SalesOrderPayments] (
    [Id] uniqueidentifier NOT NULL,
    [SalesOrderId] uniqueidentifier NOT NULL,
    [PaymentDate] date NOT NULL,
    [Amount] decimal(18,2) NOT NULL,
    [Method] nvarchar(20) NOT NULL,
    [Reference] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_SalesOrderPayments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SalesOrderPayments_SalesOrders_SalesOrderId] FOREIGN KEY ([SalesOrderId]) REFERENCES [SalesOrders] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [DownPaymentApplications] (
    [Id] uniqueidentifier NOT NULL,
    [SalesOrderPaymentId] uniqueidentifier NOT NULL,
    [InvoiceId] uniqueidentifier NOT NULL,
    [AmountApplied] decimal(18,2) NOT NULL,
    [AppliedAt] datetimeoffset NOT NULL,
    CONSTRAINT [PK_DownPaymentApplications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DownPaymentApplications_Invoices_InvoiceId] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_DownPaymentApplications_SalesOrderPayments_SalesOrderPaymentId] FOREIGN KEY ([SalesOrderPaymentId]) REFERENCES [SalesOrderPayments] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_DownPaymentApplications_InvoiceId] ON [DownPaymentApplications] ([InvoiceId]);
GO

CREATE INDEX [IX_DownPaymentApplications_SalesOrderPaymentId] ON [DownPaymentApplications] ([SalesOrderPaymentId]);
GO

CREATE INDEX [IX_SalesOrderPayments_SalesOrderId] ON [SalesOrderPayments] ([SalesOrderId]);
GO

COMMIT;
GO
