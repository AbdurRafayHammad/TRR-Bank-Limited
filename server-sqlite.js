const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = './bank.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error(err);
    else console.log('SQLite Connected → bank.db ready!');
});

const sqlFile = path.join(__dirname, 'database.sql');
if (fs.existsSync(sqlFile)) {
    const sql = fs.readFileSync(sqlFile, 'utf8');
    db.exec(sql, (err) => {
        if (err) console.error("SQL File Error:", err);
        else console.log('database.sql executed successfully!');
    });
} else {
    console.log('database.sql not found — creating tables manually...');
    createTablesAndData();
}

function createTablesAndData() {
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
            Type TEXT DEFAULT 'Savings',
            Balance REAL DEFAULT 0,
            Status TEXT DEFAULT 'Active',
            FOREIGN KEY(CustomerID) REFERENCES Customer(CustomerID)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS TransLog (
            TransID INTEGER PRIMARY KEY AUTOINCREMENT,
            FromAccount INTEGER,
            ToAccount INTEGER,
            Amount REAL,
            Type TEXT,
            DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS AuditLog (
            LogID INTEGER PRIMARY KEY AUTOINCREMENT,
            Operation TEXT,
            TableAffected TEXT,
            Details TEXT,
            DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.get("SELECT COUNT(*) as c FROM Customer", (err, row) => {
            if (row.c === 0) {
                db.run("INSERT INTO Customer (Name, CNIC, Contact) VALUES ('Ahmed Khan', '12345-6789012-3', '03001234567'), ('Sara Ali', '98765-4321098-7', '03111234567')");
                db.run("INSERT INTO Account (CustomerID, Type, Balance) VALUES (1,'Savings',50000),(1,'Current',20000),(2,'Savings',75000)");
            }
        });
    });
}

app.get('/customers', (req, res) => db.all("SELECT * FROM Customer", [], (e,r) => res.json(r||[])));

app.post('/customers', (req, res) => {
    const {name, cnic, contact} = req.body;
    db.run("INSERT INTO Customer (Name, CNIC, Contact) VALUES (?,?,?)", [name,cnic,contact], function(e){
        res.json(e ? {error:'CNIC exists'} : {message:'Customer added', id:this.lastID});
    });
});

app.get('/accounts', (req, res) => {
    db.all("SELECT a.*, c.Name FROM Account a JOIN Customer c ON a.CustomerID = c.CustomerID", [], (e,r) => res.json(r||[]));
});

app.post('/accounts', (req, res) => {
    const {customerID, type, balance} = req.body;
    db.run("INSERT INTO Account (CustomerID, Type, Balance) VALUES (?,?,?)", [customerID, type, balance||0], function(e){
        res.json(e ? {error:'Failed'} : {message:'Account created!', id:this.lastID});
    });
});

app.post('/deposit', (req, res) => {
    const {accountNo, amount} = req.body;
    db.run("UPDATE Account SET Balance = Balance + ? WHERE AccountNo = ?", [amount, accountNo], function(e){
        if (this.changes===0) return res.status(400).json({message:'Account not found'});
        db.run("INSERT INTO TransLog (FromAccount, Amount, Type) VALUES (?,?, 'Deposit')", [accountNo, amount]);
        res.json({message:'Deposit successful!'});
    });
});

app.post('/withdraw', (req, res) => {
    const {accountNo, amount} = req.body;
    db.get("SELECT Balance FROM Account WHERE AccountNo = ?", [accountNo], (e, row) => {
        if (!row || row.Balance < amount) return res.status(400).json({message:'Insufficient balance'});
        db.run("UPDATE Account SET Balance = Balance - ? WHERE AccountNo = ?", [amount, accountNo]);
        db.run("INSERT INTO TransLog (FromAccount, Amount, Type) VALUES (?,?, 'Withdraw')", [accountNo, amount]);
        res.json({message:'Withdrawal successful!'});
    });
});

app.post('/transfer', (req, res) => {
    const {fromAccount, toAccount, amount} = req.body;
    if (fromAccount === toAccount) return res.status(400).json({message:'Same account!'});
    
    db.get("SELECT Balance FROM Account WHERE AccountNo = ?", [fromAccount], (e, row) => {
        if (!row || row.Balance < amount) return res.status(400).json({message:'Insufficient balance'});
        db.run("UPDATE Account SET Balance = Balance - ? WHERE AccountNo = ?", [amount, fromAccount]);
        db.run("UPDATE Account SET Balance = Balance + ? WHERE AccountNo = ?", [amount, toAccount]);
        db.run("INSERT INTO TransLog (FromAccount, ToAccount, Amount, Type) VALUES (?,?,?, 'Transfer')", [fromAccount, toAccount, amount]);
        res.json({message:'Transfer successful!'});
    });
});

app.get('/audit', (req, res) => {
    db.all("SELECT LogID, Operation, TableAffected, Details, strftime('%d-%m-%Y %H:%M', DateTime) AS Time FROM AuditLog ORDER BY LogID DESC LIMIT 50", [], (e,r) => res.json(r||[]));
});

app.listen(5000, () => console.log('FINAL SQLITE SERVER → http://localhost:5000'));