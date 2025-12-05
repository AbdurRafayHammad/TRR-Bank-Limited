const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./bank.db', (err) => {
    if (err) console.error("DB Error:", err);
    else console.log('DATABASE CONNECTED → bank.db');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Customer (
        CustomerID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        CNIC TEXT UNIQUE NOT NULL,
        Contact TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Account (
        AccountNo INTEGER PRIMARY KEY AUTOINCREMENT,
        CustomerID INTEGER,
        Name TEXT,
        Type TEXT DEFAULT 'Savings',
        Balance REAL DEFAULT 0,
        Status TEXT DEFAULT 'Active',
        FOREIGN KEY(CustomerID) REFERENCES Customer(CustomerID)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS AuditLog (
        LogID INTEGER PRIMARY KEY AUTOINCREMENT,
        Operation TEXT,
        TableAffected TEXT,
        Details TEXT,
        DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get("SELECT COUNT(*) as total FROM Customer", (err, row) => {
        if (err) {
            console.error("Error checking customers:", err);
            return;
        }

        if (row.total === 0) {
            console.log("First time running — Adding sample customers & accounts...");

            db.run("INSERT INTO Customer (Name, CNIC, Contact) VALUES ('Ahmed Khan', '12345-6789012-3', '0300-1234567')");
            db.run("INSERT INTO Customer (Name, CNIC, Contact) VALUES ('Sara Ali', '98765-4321098-7', '0311-9876543')");

            db.run("INSERT INTO Account (CustomerID, Name, Type, Balance) VALUES (1, 'Ahmed Khan', 'Savings', 50000)");
            db.run("INSERT INTO Account (CustomerID, Name, Type, Balance) VALUES (1, 'Ahmed Khan', 'Current', 20000)");
            db.run("INSERT INTO Account (CustomerID, Name, Type, Balance) VALUES (2, 'Sara Ali', 'Savings', 75000)");

            logAudit('SYSTEM START', 'System', 'Sample data inserted (first run only)');
            console.log("Sample data added successfully!");
        } else {
            console.log(`Database already has ${row.total} customers — Skipping sample data`);
        }
    });

    db.run("INSERT OR IGNORE INTO AuditLog (Operation, TableAffected, Details) VALUES ('SYSTEM START', 'System', 'TRR Bank System Started')");
    db.run("INSERT OR IGNORE INTO AuditLog (Operation, TableAffected, Details) VALUES ('SAMPLE LOG', 'Test', 'Audit log is working perfectly')");
});

function logAudit(op, table, details) {
    db.run("INSERT INTO AuditLog (Operation, TableAffected, Details) VALUES (?, ?, ?)", [op, table, details]);
}

app.get('/customers', (req, res) => {
    db.all("SELECT * FROM Customer ORDER BY CustomerID", [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/customers', (req, res) => {
    const { name, cnic, contact } = req.body;

    if (!name || !cnic) {
        return res.status(400).json({ error: 'Name and CNIC are required' });
    }

    db.run(`INSERT INTO Customer (Name, CNIC, Contact) VALUES (?, ?, ?)`,
        [name, cnic, contact || null],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'This CNIC already exists!' });
                }
                return res.status(500).json({ error: err.message });
            }
            const newId = this.lastID;
            logAudit('ADD CUSTOMER', 'Customer', `New customer: ${name} (CNIC: ${cnic}) → ID: ${newId}`);
            res.json({ id: newId });
        }
    );
});

app.get('/accounts', (req, res) => {
    db.all(`SELECT a.*, c.Name FROM Account a JOIN Customer c ON a.CustomerID = c.CustomerID ORDER BY a.AccountNo`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/accounts', (req, res) => {
    const { customerID, type, balance = 0 } = req.body;

    db.get("SELECT Name FROM Customer WHERE CustomerID = ?", [customerID], (err, cust) => {
        if (!cust) return res.status(400).json({ error: 'Customer not found' });

        db.run(`INSERT INTO Account (CustomerID, Name, Type, Balance) VALUES (?, ?, ?, ?)`,
            [customerID, cust.Name, type || 'Savings', balance],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                logAudit('CREATE ACCOUNT', 'Account', `${type} account #${this.lastID} created for ${cust.Name} (Bal: Rs.${balance})`);
                res.json({ AccountNo: this.lastID });
            }
        );
    });
});

// DEPOSIT
app.post('/deposit', (req, res) => {
    const { accountNo, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.run("UPDATE Account SET Balance = Balance + ? WHERE AccountNo = ?", [amount, accountNo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(400).json({ error: 'Account not found' });

        logAudit('DEPOSIT', 'Account', `+Rs.${amount} → Account ${accountNo}`);
        res.json({ message: 'Deposit successful' });
    });
});

// WITHDRAW (with balance check)
app.post('/withdraw', (req, res) => {
    const { accountNo, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    db.get("SELECT Balance FROM Account WHERE AccountNo = ?", [accountNo], (err, row) => {
        if (err || !row) return res.status(400).json({ error: 'Account not found' });
        if (row.Balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

        db.run("UPDATE Account SET Balance = Balance - ? WHERE AccountNo = ?", [amount, accountNo], function() {
            logAudit('WITHDRAW', 'Account', `-Rs.${amount} ← Account ${accountNo} (New Bal: Rs.${row.Balance - amount})`);
            res.json({ message: 'Withdrawal successful' });
        });
    });
});

// TRANSFER (REAL MONEY MOVEMENT + ATOMIC)
app.post('/transfer', (req, res) => {
    const { fromAccount, toAccount, amount } = req.body;

    if (!fromAccount || !toAccount || !amount || amount <= 0)
        return res.status(400).json({ error: 'Invalid request' });
    if (fromAccount === toAccount)
        return res.status(400).json({ error: 'Cannot transfer to same account' });

    db.run('BEGIN TRANSACTION');

    db.get("SELECT Balance FROM Account WHERE AccountNo = ?", [fromAccount], (err, from) => {
        if (err || !from || from.Balance < amount) {
            db.run('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient balance or source account not found' });
        }

        db.run("UPDATE Account SET Balance = Balance - ? WHERE AccountNo = ?", [amount, fromAccount], () => {
            db.run("UPDATE Account SET Balance = Balance + ? WHERE AccountNo = ?", [amount, toAccount], function(err) {
                if (err || this.changes === 0) {
                    db.run('ROLLBACK');
                    return res.status(400).json({ error: 'Recipient account not found' });
                }

                db.run('COMMIT');
                logAudit('TRANSFER', 'Account', `Rs.${amount} transferred from ${fromAccount} → ${toAccount}`);
                res.json({ message: 'Transfer successful' });
            });
        });
    });
});

// AUDIT LOG
app.get('/audit', (req, res) => {
    db.all(`SELECT LogID, Operation, TableAffected, Details, 
            strftime('%d-%m-%Y %I:%M %p', DateTime) AS Time 
            FROM AuditLog ORDER BY LogID DESC`, [], (err, rows) => {
        res.json(rows || []);
    });
});

// START SERVER
app.listen(5000, () => {
    console.log('=====================================');
    console.log('   TRR BANK SERVER RUNNING');
    console.log('   http://localhost:5000');

});