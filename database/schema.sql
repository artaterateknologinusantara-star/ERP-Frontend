-- ============================================================
-- Syntera ERP — SQL Server Schema
-- Business: IT Infrastructure & Project Services
-- Version: 1.0 (MVP)
-- ============================================================

-- ─── Audit Mixin (applied to all tables via columns) ─────────────────────────
-- CreatedAt, UpdatedAt, CreatedBy, UpdatedBy, IsDeleted

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE Roles (
    Id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name        NVARCHAR(50)  NOT NULL UNIQUE,
    Description NVARCHAR(255),
    IsActive    BIT           NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE Users (
    Id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    RoleId       UNIQUEIDENTIFIER NOT NULL REFERENCES Roles(Id),
    Name         NVARCHAR(100) NOT NULL,
    Email        NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    IsActive     BIT           NOT NULL DEFAULT 1,
    LastLoginAt  DATETIME2,
    CreatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    IsDeleted    BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_Users_Email ON Users(Email);

CREATE TABLE Categories (
    Id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name      NVARCHAR(100) NOT NULL,
    Type      NVARCHAR(20)  NOT NULL CHECK (Type IN ('Material', 'Service', 'Both')),
    IsActive  BIT           NOT NULL DEFAULT 1,
    CreatedAt DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE Brands (
    Id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Name      NVARCHAR(100) NOT NULL UNIQUE,
    IsActive  BIT           NOT NULL DEFAULT 1,
    CreatedAt DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE Units (
    Id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Code      NVARCHAR(20)  NOT NULL UNIQUE,
    Name      NVARCHAR(50)  NOT NULL,
    CreatedAt DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);
INSERT INTO Units (Id, Code, Name) VALUES
    (NEWID(), 'Unit',   'Unit'),
    (NEWID(), 'Box',    'Box'),
    (NEWID(), 'Meter',  'Meter'),
    (NEWID(), 'Ls',     'Lumpsum'),
    (NEWID(), 'Titik',  'Titik'),
    (NEWID(), 'Batang', 'Batang'),
    (NEWID(), 'Pack',   'Pack'),
    (NEWID(), 'Set',    'Set'),
    (NEWID(), 'Lot',    'Lot');

CREATE TABLE Items (
    Id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Code        NVARCHAR(30)  NOT NULL UNIQUE,
    Name        NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500),
    CategoryId  UNIQUEIDENTIFIER REFERENCES Categories(Id),
    BrandId     UNIQUEIDENTIFIER REFERENCES Brands(Id),
    UnitId      UNIQUEIDENTIFIER NOT NULL REFERENCES Units(Id),
    Type        NVARCHAR(10)  NOT NULL CHECK (Type IN ('Material', 'Service')),
    BasePrice   DECIMAL(18,2) NOT NULL DEFAULT 0,
    IsActive    BIT           NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    IsDeleted   BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_Items_Code ON Items(Code);
CREATE INDEX IX_Items_Name ON Items(Name);

CREATE TABLE Customers (
    Id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Code          NVARCHAR(20)  NOT NULL UNIQUE,
    Name          NVARCHAR(200) NOT NULL,
    Industry      NVARCHAR(100),
    ContactPerson NVARCHAR(100),
    Phone         NVARCHAR(30),
    Email         NVARCHAR(150),
    Address       NVARCHAR(500),
    City          NVARCHAR(100),
    Npwp          NVARCHAR(30),
    IsActive      BIT           NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy     UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted     BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_Customers_Name ON Customers(Name);

CREATE TABLE Suppliers (
    Id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Code          NVARCHAR(20)  NOT NULL UNIQUE,
    Name          NVARCHAR(200) NOT NULL,
    ContactPerson NVARCHAR(100),
    Phone         NVARCHAR(30),
    Email         NVARCHAR(150),
    Address       NVARCHAR(500),
    City          NVARCHAR(100),
    Npwp          NVARCHAR(30),
    BankName      NVARCHAR(100),
    BankAccount   NVARCHAR(50),
    IsActive      BIT           NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy     UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted     BIT           NOT NULL DEFAULT 0
);

-- ============================================================
-- NUMBERING CONFIG (Document No. auto-generation)
-- ============================================================

CREATE TABLE NumberingConfigs (
    Id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    DocType    NVARCHAR(30)  NOT NULL UNIQUE,
    Prefix     NVARCHAR(20)  NOT NULL,
    Pattern    NVARCHAR(50)  NOT NULL DEFAULT '{PREFIX}-{YY}.{NNNN}',
    LastNumber INT           NOT NULL DEFAULT 0,
    UpdatedAt  DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);
INSERT INTO NumberingConfigs (Id, DocType, Prefix, LastNumber) VALUES
    (NEWID(), 'QUOTATION',         'Q.SYN',   148),
    (NEWID(), 'SALES_ORDER',       'SO.SYN',  48),
    (NEWID(), 'INVOICE',           'INV.SYN', 64),
    (NEWID(), 'PURCHASE_REQUEST',  'PR.SYN',  34),
    (NEWID(), 'PURCHASE_ORDER',    'PO.SYN',  19),
    (NEWID(), 'GOODS_RECEIPT',     'GR.SYN',  15);

-- ============================================================
-- COSTING & QUOTATION
-- ============================================================

CREATE TABLE Quotations (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No              NVARCHAR(30)  NOT NULL UNIQUE,
    CustomerId      UNIQUEIDENTIFIER NOT NULL REFERENCES Customers(Id),
    ProjectName     NVARCHAR(300) NOT NULL,
    Date            DATE          NOT NULL,
    ValidUntil      DATE          NOT NULL,
    SalesId         UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    Revision        SMALLINT      NOT NULL DEFAULT 0,
    ParentId        UNIQUEIDENTIFIER REFERENCES Quotations(Id),   -- for revision tracking
    Status          NVARCHAR(20)  NOT NULL DEFAULT 'Draft'
                        CHECK (Status IN ('Draft','Terkirim','Disetujui','Ditolak','Kadaluarsa')),
    Discount        DECIMAL(5,2)  NOT NULL DEFAULT 0,
    TaxRate         DECIMAL(5,2)  NOT NULL DEFAULT 11,
    TotalMaterial   DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalService    DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalBeforeTax  DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount       DECIMAL(18,2) NOT NULL DEFAULT 0,
    GrandTotal      DECIMAL(18,2) NOT NULL DEFAULT 0,
    PaymentTerms    NVARCHAR(500),
    Notes           NVARCHAR(MAX),
    AdditionalNotes NVARCHAR(MAX),
    ApprovedAt      DATETIME2,
    ApprovedBy      UNIQUEIDENTIFIER REFERENCES Users(Id),
    CreatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy       UNIQUEIDENTIFIER REFERENCES Users(Id),
    UpdatedBy       UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted       BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_Quotations_No         ON Quotations(No);
CREATE INDEX IX_Quotations_CustomerId ON Quotations(CustomerId);
CREATE INDEX IX_Quotations_Status     ON Quotations(Status);
CREATE INDEX IX_Quotations_SalesId    ON Quotations(SalesId);

CREATE TABLE QuotationTabs (
    Id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    QuotationId UNIQUEIDENTIFIER NOT NULL REFERENCES Quotations(Id) ON DELETE CASCADE,
    Label       NVARCHAR(100) NOT NULL,
    SortOrder   SMALLINT      NOT NULL DEFAULT 0
);
CREATE INDEX IX_QuotationTabs_QuotationId ON QuotationTabs(QuotationId);

CREATE TABLE QuotationGroups (
    Id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    TabId     UNIQUEIDENTIFIER NOT NULL REFERENCES QuotationTabs(Id) ON DELETE CASCADE,
    Name      NVARCHAR(200) NOT NULL,
    SortOrder SMALLINT      NOT NULL DEFAULT 0
);
CREATE INDEX IX_QuotationGroups_TabId ON QuotationGroups(TabId);

CREATE TABLE QuotationItems (
    Id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    GroupId      UNIQUEIDENTIFIER NOT NULL REFERENCES QuotationGroups(Id) ON DELETE CASCADE,
    ItemNo       NVARCHAR(10)  NOT NULL,
    Equipment    NVARCHAR(200) NOT NULL,
    Description  NVARCHAR(500),
    Manufacturer NVARCHAR(100),
    Qty          DECIMAL(12,4) NOT NULL DEFAULT 1,
    Unit         NVARCHAR(20)  NOT NULL,
    ServicePrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    MaterialPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
    SortOrder    SMALLINT      NOT NULL DEFAULT 0,
    -- computed helpers (denormalized for query speed)
    TotalService  AS (Qty * ServicePrice)  PERSISTED,
    TotalMaterial AS (Qty * MaterialPrice) PERSISTED,
    GrandLine     AS (Qty * (ServicePrice + MaterialPrice)) PERSISTED
);
CREATE INDEX IX_QuotationItems_GroupId ON QuotationItems(GroupId);

-- ============================================================
-- SALES ORDER
-- ============================================================

CREATE TABLE SalesOrders (
    Id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No           NVARCHAR(30)  NOT NULL UNIQUE,
    QuotationId  UNIQUEIDENTIFIER REFERENCES Quotations(Id),
    CustomerId   UNIQUEIDENTIFIER NOT NULL REFERENCES Customers(Id),
    ProjectName  NVARCHAR(300) NOT NULL,
    Date         DATE          NOT NULL,
    DeliveryDate DATE,
    SalesId      UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    Status       NVARCHAR(20)  NOT NULL DEFAULT 'Draft'
                     CHECK (Status IN ('Draft','Open','Delivered','Completed','Cancelled')),
    Total        DECIMAL(18,2) NOT NULL DEFAULT 0,
    Notes        NVARCHAR(MAX),
    CreatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy    UNIQUEIDENTIFIER REFERENCES Users(Id),
    UpdatedBy    UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted    BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_SalesOrders_No         ON SalesOrders(No);
CREATE INDEX IX_SalesOrders_CustomerId ON SalesOrders(CustomerId);
CREATE INDEX IX_SalesOrders_Status     ON SalesOrders(Status);

-- ============================================================
-- PURCHASING
-- ============================================================

CREATE TABLE PurchaseRequests (
    Id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No            NVARCHAR(30)  NOT NULL UNIQUE,
    SalesOrderId  UNIQUEIDENTIFIER REFERENCES SalesOrders(Id),
    RequestedBy   UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    Date          DATE          NOT NULL,
    Status        NVARCHAR(20)  NOT NULL DEFAULT 'Draft'
                      CHECK (Status IN ('Draft','Submitted','Approved','Rejected','Ordered')),
    Total         DECIMAL(18,2) NOT NULL DEFAULT 0,
    Notes         NVARCHAR(MAX),
    ApprovedAt    DATETIME2,
    ApprovedBy    UNIQUEIDENTIFIER REFERENCES Users(Id),
    CreatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    IsDeleted     BIT           NOT NULL DEFAULT 0
);

CREATE TABLE PurchaseRequestItems (
    Id        UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PRId      UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseRequests(Id) ON DELETE CASCADE,
    ItemId    UNIQUEIDENTIFIER REFERENCES Items(Id),
    ItemName  NVARCHAR(200) NOT NULL,
    Qty       DECIMAL(12,4) NOT NULL,
    Unit      NVARCHAR(20)  NOT NULL,
    EstPrice  DECIMAL(18,2) NOT NULL DEFAULT 0,
    Notes     NVARCHAR(300)
);
CREATE INDEX IX_PRItems_PRId ON PurchaseRequestItems(PRId);

CREATE TABLE PurchaseOrders (
    Id                 UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No                 NVARCHAR(30)  NOT NULL UNIQUE,
    PurchaseRequestId  UNIQUEIDENTIFIER REFERENCES PurchaseRequests(Id),
    SupplierId         UNIQUEIDENTIFIER NOT NULL REFERENCES Suppliers(Id),
    Date               DATE          NOT NULL,
    DeliveryDate       DATE,
    Status             NVARCHAR(30)  NOT NULL DEFAULT 'Draft'
                           CHECK (Status IN ('Draft','Ordered','Partial Receive','Completed','Cancelled')),
    Total              DECIMAL(18,2) NOT NULL DEFAULT 0,
    Notes              NVARCHAR(MAX),
    CreatedAt          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt          DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy          UNIQUEIDENTIFIER REFERENCES Users(Id),
    UpdatedBy          UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted          BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_PurchaseOrders_No         ON PurchaseOrders(No);
CREATE INDEX IX_PurchaseOrders_SupplierId ON PurchaseOrders(SupplierId);

CREATE TABLE PurchaseOrderItems (
    Id         UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    POId       UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseOrders(Id) ON DELETE CASCADE,
    PRItemId   UNIQUEIDENTIFIER REFERENCES PurchaseRequestItems(Id),
    ItemId     UNIQUEIDENTIFIER REFERENCES Items(Id),
    ItemName   NVARCHAR(200) NOT NULL,
    Qty        DECIMAL(12,4) NOT NULL,
    Unit       NVARCHAR(20)  NOT NULL,
    Price      DECIMAL(18,2) NOT NULL,
    ReceivedQty DECIMAL(12,4) NOT NULL DEFAULT 0,
    Total      AS (Qty * Price) PERSISTED
);
CREATE INDEX IX_POItems_POId ON PurchaseOrderItems(POId);

CREATE TABLE GoodsReceipts (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No              NVARCHAR(30)  NOT NULL UNIQUE,
    PurchaseOrderId UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseOrders(Id),
    ReceiptDate     DATE          NOT NULL,
    ReceivedBy      UNIQUEIDENTIFIER NOT NULL REFERENCES Users(Id),
    Notes           NVARCHAR(MAX),
    CreatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE GoodsReceiptItems (
    Id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    GRId         UNIQUEIDENTIFIER NOT NULL REFERENCES GoodsReceipts(Id) ON DELETE CASCADE,
    POItemId     UNIQUEIDENTIFIER NOT NULL REFERENCES PurchaseOrderItems(Id),
    ReceivedQty  DECIMAL(12,4) NOT NULL,
    Notes        NVARCHAR(300)
);

-- ============================================================
-- FINANCE — ACCOUNTS RECEIVABLE
-- ============================================================

CREATE TABLE Invoices (
    Id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No            NVARCHAR(30)  NOT NULL UNIQUE,
    SalesOrderId  UNIQUEIDENTIFIER REFERENCES SalesOrders(Id),
    CustomerId    UNIQUEIDENTIFIER NOT NULL REFERENCES Customers(Id),
    InvoiceDate   DATE          NOT NULL,
    DueDate       DATE          NOT NULL,
    Amount        DECIMAL(18,2) NOT NULL,
    Paid          DECIMAL(18,2) NOT NULL DEFAULT 0,
    Balance       AS (Amount - Paid) PERSISTED,
    Status        NVARCHAR(20)  NOT NULL DEFAULT 'Draft'
                      CHECK (Status IN ('Draft','Sent','Partial Paid','Paid','Overdue')),
    Notes         NVARCHAR(MAX),
    CreatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy     UNIQUEIDENTIFIER REFERENCES Users(Id),
    UpdatedBy     UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted     BIT           NOT NULL DEFAULT 0
);
CREATE INDEX IX_Invoices_No         ON Invoices(No);
CREATE INDEX IX_Invoices_CustomerId ON Invoices(CustomerId);
CREATE INDEX IX_Invoices_Status     ON Invoices(Status);
CREATE INDEX IX_Invoices_DueDate    ON Invoices(DueDate);

CREATE TABLE Payments (
    Id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    InvoiceId   UNIQUEIDENTIFIER NOT NULL REFERENCES Invoices(Id),
    PaymentDate DATE          NOT NULL,
    Amount      DECIMAL(18,2) NOT NULL,
    Method      NVARCHAR(20)  NOT NULL CHECK (Method IN ('Transfer','Tunai','Giro','Cek')),
    Reference   NVARCHAR(100),
    Notes       NVARCHAR(500),
    RecordedBy  UNIQUEIDENTIFIER REFERENCES Users(Id),
    CreatedAt   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);
CREATE INDEX IX_Payments_InvoiceId ON Payments(InvoiceId);

-- ============================================================
-- FINANCE — ACCOUNTS PAYABLE
-- ============================================================

CREATE TABLE SupplierInvoices (
    Id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    No              NVARCHAR(30)  NOT NULL UNIQUE,
    PurchaseOrderId UNIQUEIDENTIFIER REFERENCES PurchaseOrders(Id),
    SupplierId      UNIQUEIDENTIFIER NOT NULL REFERENCES Suppliers(Id),
    InvoiceDate     DATE          NOT NULL,
    DueDate         DATE          NOT NULL,
    Amount          DECIMAL(18,2) NOT NULL,
    Paid            DECIMAL(18,2) NOT NULL DEFAULT 0,
    Balance         AS (Amount - Paid) PERSISTED,
    Status          NVARCHAR(20)  NOT NULL DEFAULT 'Draft'
                        CHECK (Status IN ('Draft','Received','Partial Paid','Paid','Overdue')),
    Notes           NVARCHAR(MAX),
    CreatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy       UNIQUEIDENTIFIER REFERENCES Users(Id),
    IsDeleted       BIT           NOT NULL DEFAULT 0
);

CREATE TABLE SupplierPayments (
    Id                UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    SupplierInvoiceId UNIQUEIDENTIFIER NOT NULL REFERENCES SupplierInvoices(Id),
    PaymentDate       DATE          NOT NULL,
    Amount            DECIMAL(18,2) NOT NULL,
    Method            NVARCHAR(20)  NOT NULL CHECK (Method IN ('Transfer','Tunai','Giro','Cek')),
    Reference         NVARCHAR(100),
    Notes             NVARCHAR(500),
    RecordedBy        UNIQUEIDENTIFIER REFERENCES Users(Id),
    CreatedAt         DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- VIEWS — for common AR/AP queries
-- ============================================================

CREATE VIEW vw_ARSummary AS
SELECT
    c.Id              AS CustomerId,
    c.Name            AS CustomerName,
    SUM(i.Amount)     AS TotalInvoice,
    SUM(i.Paid)       AS TotalPaid,
    SUM(i.Balance)    AS Outstanding,
    SUM(CASE WHEN DATEDIFF(DAY, i.DueDate, GETDATE()) BETWEEN 0  AND 30  THEN i.Balance ELSE 0 END) AS Aging0_30,
    SUM(CASE WHEN DATEDIFF(DAY, i.DueDate, GETDATE()) BETWEEN 31 AND 60  THEN i.Balance ELSE 0 END) AS Aging31_60,
    SUM(CASE WHEN DATEDIFF(DAY, i.DueDate, GETDATE()) BETWEEN 61 AND 90  THEN i.Balance ELSE 0 END) AS Aging61_90,
    SUM(CASE WHEN DATEDIFF(DAY, i.DueDate, GETDATE()) > 90              THEN i.Balance ELSE 0 END) AS AgingOver90,
    MAX(p.PaymentDate) AS LastPaymentDate
FROM Invoices i
JOIN Customers c ON c.Id = i.CustomerId
LEFT JOIN Payments p ON p.InvoiceId = i.Id
WHERE i.IsDeleted = 0 AND i.Balance > 0
GROUP BY c.Id, c.Name;

CREATE VIEW vw_APSummary AS
SELECT
    s.Id              AS SupplierId,
    s.Name            AS SupplierName,
    SUM(si.Amount)    AS TotalInvoice,
    SUM(si.Paid)      AS TotalPaid,
    SUM(si.Balance)   AS Outstanding,
    SUM(CASE WHEN DATEDIFF(DAY, si.DueDate, GETDATE()) BETWEEN 0  AND 30  THEN si.Balance ELSE 0 END) AS Aging0_30,
    SUM(CASE WHEN DATEDIFF(DAY, si.DueDate, GETDATE()) BETWEEN 31 AND 60  THEN si.Balance ELSE 0 END) AS Aging31_60,
    SUM(CASE WHEN DATEDIFF(DAY, si.DueDate, GETDATE()) BETWEEN 61 AND 90  THEN si.Balance ELSE 0 END) AS Aging61_90,
    SUM(CASE WHEN DATEDIFF(DAY, si.DueDate, GETDATE()) > 90               THEN si.Balance ELSE 0 END) AS AgingOver90,
    MAX(sp.PaymentDate) AS LastPaymentDate
FROM SupplierInvoices si
JOIN Suppliers s ON s.Id = si.SupplierId
LEFT JOIN SupplierPayments sp ON sp.SupplierInvoiceId = si.Id
WHERE si.IsDeleted = 0 AND si.Balance > 0
GROUP BY s.Id, s.Name;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- Auto-generate document number
CREATE OR ALTER PROCEDURE sp_GetNextDocNo
    @DocType  NVARCHAR(30),
    @DocNo    NVARCHAR(30) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Prefix     NVARCHAR(20);
    DECLARE @NextNumber INT;
    DECLARE @Year       NVARCHAR(2);

    SET @Year = RIGHT(CAST(YEAR(GETDATE()) AS NVARCHAR(4)), 2);

    UPDATE NumberingConfigs
    SET LastNumber = LastNumber + 1,
        UpdatedAt  = GETUTCDATE(),
        @Prefix = Prefix,
        @NextNumber = LastNumber + 1
    WHERE DocType = @DocType;

    SET @DocNo = @Prefix + '-' + @Year + '.' + RIGHT('0000' + CAST(@NextNumber AS NVARCHAR(4)), 4);
END;

-- Update invoice status automatically based on paid amount
CREATE OR ALTER PROCEDURE sp_UpdateInvoiceStatus
    @InvoiceId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Amount  DECIMAL(18,2);
    DECLARE @Paid    DECIMAL(18,2);
    DECLARE @DueDate DATE;
    DECLARE @Status  NVARCHAR(20);

    SELECT @Amount = Amount, @Paid = Paid, @DueDate = DueDate
    FROM Invoices WHERE Id = @InvoiceId;

    IF @Paid = 0 AND @DueDate < CAST(GETDATE() AS DATE)
        SET @Status = 'Overdue';
    ELSE IF @Paid = 0
        SET @Status = 'Sent';
    ELSE IF @Paid >= @Amount
        SET @Status = 'Paid';
    ELSE
        SET @Status = 'Partial Paid';

    UPDATE Invoices SET Status = @Status, UpdatedAt = GETUTCDATE()
    WHERE Id = @InvoiceId;
END;
