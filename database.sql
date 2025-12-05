
PRAGMA foreign_keys = ON;

-- Customers
CREATE TABLE IF NOT EXISTS Customer (
    CustomerID INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    CNIC TEXT UNIQUE NOT NULL,
    Contact TEXT
);

-- Accounts
CREATE TABLE IF NOT EXISTS Account (
    AccountNo INTEGER PRIMARY KEY AUTOINCREMENT,
    CustomerID INTEGER,
    Type TEXT DEFAULT 'Savings',
    Balance REAL DEFAULT 0,
    Status TEXT DEFAULT 'Active',
    FOREIGN KEY(CustomerID) REFERENCES Customer(CustomerID)
);

-- Transaction Log
CREATE TABLE IF NOT EXISTS TransLog (
    TransID INTEGER PRIMARY KEY AUTOINCREMENT,
    FromAccount INTEGER,
    ToAccount INTEGER,
    Amount REAL,
    Type TEXT,
    DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE IF NOT EXISTS AuditLog (
    LogID INTEGER PRIMARY KEY AUTOINCREMENT,
    Operation TEXT,
    TableAffected TEXT,
    Details TEXT,
    DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INSERT ONLY CLEAN DATA (NO DUPLICATES)
DELETE FROM Account;
DELETE FROM Customer;

INSERT INTO Customer (CustomerID, Name, CNIC, Contact) VALUES
(1, 'Ahmed Khan', '12345-6789012-3', '0300-1234567'),
(2, 'Sara Ali', '98765-4321098-7', '0311-9876543');

INSERT INTO Account (AccountNo, CustomerID, Type, Balance, Status) VALUES
(1, 1, 'Savings', 55000.00, 'Active'),
(2, 1, 'Current', 30000.00, 'Active'),
(3, 2, 'Savings', 75000.00, 'Active');
