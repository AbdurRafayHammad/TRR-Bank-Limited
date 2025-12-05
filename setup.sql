
CREATE DATABASE IF NOT EXISTS cbs_db;
USE cbs_db;

DROP TABLE IF EXISTS Transaction;
DROP TABLE IF EXISTS Account;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS AuditLog;

CREATE TABLE Customer (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    CNIC VARCHAR(20) UNIQUE NOT NULL,
    Contact VARCHAR(15)
);

CREATE TABLE Account (
    AccountNo INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT,
    Type ENUM('Savings', 'Current') DEFAULT 'Savings',
    Balance DECIMAL(15,2) DEFAULT 0.00,
    Status ENUM('Active', 'Inactive') DEFAULT 'Active',
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE CASCADE
);

CREATE TABLE Transaction (
    TransID INT AUTO_INCREMENT PRIMARY KEY,
    FromAccount INT,
    ToAccount INT,
    Amount DECIMAL(15,2) NOT NULL,
    Type ENUM('Deposit', 'Withdraw', 'Transfer') NOT NULL,
    DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (FromAccount) REFERENCES Account(AccountNo),
    FOREIGN KEY (ToAccount) REFERENCES Account(AccountNo)
);

CREATE TABLE AuditLog (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    Operation VARCHAR(50),
    TableAffected VARCHAR(50),
    UserName VARCHAR(50),
    Details TEXT,
    DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO Customer (Name, CNIC, Contact) VALUES 
('Ahmed Khan', '12345-6789012-3', '03001234567'),
('Sara Ali', '98765-4321098-7', '03111234567');

INSERT INTO Account (CustomerID, Type, Balance) VALUES 
(1, 'Savings', 50000.00),
(1, 'Current', 20000.00),
(2, 'Savings', 75000.00);