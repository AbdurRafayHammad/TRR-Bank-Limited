# TRR-Bank-Limited
 A simplified Core Banking System designed for academic purposes, demonstrating how essential banking operations work using SQL, SQLite database, and transaction control (TCL).
This project simulates a mini Core Banking System that includes:

- Customer Management  
- Account Management  
- Transaction Handling (Deposit, Withdrawal, Transfer)  
- Audit Logging (COMMIT, ROLLBACK, SAVEPOINT tracking)  

SQLite is used as the backend database due to its lightweight nature and support for transaction control commands.

 Objectives
- Build a centralized and consistent mini banking system.
- Demonstrate ACID properties using `COMMIT`, `ROLLBACK`, and `SAVEPOINT`.
- Implement core banking modules with secure and traceable operations.
- Provide views for **Admin** and **User** roles.

 Modules Included

 1️⃣ **Customer Management**
- Create and manage customer profiles  
- Fields: `CustomerID`, `Name`, `CNIC`, `Contact`

 2️⃣ **Account Management**
- Open, manage, and update accounts  
- Fields: `AccountNo`, `CustomerID`, `Type`, `Balance`, `Status`

3️⃣ **Transaction Management**
- Deposit  
- Withdrawal  
- Transfer  
- Every operation logged in `TransactionLog` and `AuditLog`

 4️⃣ **Audit / Security Control**
- Tracks operations such as INSERT, UPDATE, DELETE, COMMIT, ROLLBACK  
- Ensures transparency and data integrity
