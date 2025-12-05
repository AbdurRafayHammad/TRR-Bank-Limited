const API = 'http://localhost:5000';
let data = { customers: [], accounts: [], audit: [] };
let currentTransType = 'deposit';
let myChart = null;

// Custom notification function - TRR Bank branded
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(15,17,22,0.95);
        border: 1px solid ${type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'};
        border-radius: 0.75rem;
        padding: 1rem 1.5rem;
        color: white;
        font-family: 'Inter', sans-serif;
        font-size: 0.95rem;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'font-weight: bold; margin-bottom: 0.5rem; font-size: 0.9rem; color: #10b981;';
    headerDiv.textContent = 'Tynovex Bank';
    notification.appendChild(headerDiv);
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `color: ${type === 'error' ? '#ef4444' : '#10b981'}; font-size: 0.9rem;`;
    messageDiv.textContent = message;
    notification.appendChild(messageDiv);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 300ms ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Clear login fields on page load to prevent autocomplete
window.addEventListener('load', () => {
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
});

// LocalStorage persistence
function saveData() {
    localStorage.setItem('mock_customers', JSON.stringify(data.customers));
    localStorage.setItem('mock_accounts', JSON.stringify(data.accounts));
    localStorage.setItem('mock_audit', JSON.stringify(data.audit));
}

function loadDataFromStorage() {
    data.customers = JSON.parse(localStorage.getItem('mock_customers') || '[]');
    data.accounts = JSON.parse(localStorage.getItem('mock_accounts') || '[]');
    data.audit = JSON.parse(localStorage.getItem('mock_audit') || '[]');
}

function switchTab(tab) {
    document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('tabSignup').style.background = tab === 'signup' ? 'rgba(59, 130, 246, 0.2)' : 'transparent';
    document.getElementById('tabSignup').style.color = tab === 'signup' ? '#60a5fa' : 'rgba(209,213,219,1)';
    document.getElementById('tabLogin').style.background = tab === 'login' ? 'rgba(16, 185, 129, 0.2)' : 'transparent';
    document.getElementById('tabLogin').style.color = tab === 'login' ? '#10b981' : 'rgba(209,213,219,1)';
}

function nextSignupStep() { document.getElementById('signupStep1').style.display = 'none'; document.getElementById('signupStep2').style.display = 'block'; }
function prevSignupStep() { document.getElementById('signupStep2').style.display = 'none'; document.getElementById('signupStep1').style.display = 'block'; }

function handleSignup(e) { 
    e.preventDefault(); 
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    
    // Check if user already exists
    const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    if (mockUsers.find(u => u.username === username)) {
        showNotification('Username already exists!', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        firstName,
        lastName,
        email,
        phone,
        username,
        password,
        createdAt: new Date().toLocaleString()
    };
    
    mockUsers.push(newUser);
    localStorage.setItem('mock_users', JSON.stringify(mockUsers));
    
    // Log the signup in audit
    logAudit('USER_SIGNUP', `New user registered: ${username} (${firstName} ${lastName})`);
    saveData();
    
    showNotification(`Account created successfully! Username: ${username}. Please login to continue.`, 'success');
    switchTab('login');
    document.getElementById('signupForm').reset();
    prevSignupStep();
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    // Validate empty fields
    if (!username || !password) {
        showNotification('Please enter both username and password', 'error');
        return;
    }
    
    console.log('Login attempt:', { username, password });
    
    // Check admin
    if (username === 'admin' && password === '12345') {
        console.log('Admin login successful');
        localStorage.setItem('currentUser', JSON.stringify({ id: 1, username: 'admin', role: 'admin' }));
        loadDataFromStorage();
        document.getElementById('authPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'flex';
        updateDash();
        return;
    }
    
    // Check registered users
    const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const user = mockUsers.find(u => u.username.trim() === username && u.password.trim() === password);
    
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify({ id: user.id, username: user.username, name: `${user.firstName} ${user.lastName}`, role: 'user' }));
        loadDataFromStorage();
        document.getElementById('authPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'flex';
        updateDash();
        logAudit('LOGIN', `User ${username} logged in`);
        saveData();
    } else {
        console.log('Login failed. Admin:', username === 'admin', password === '12345');
        showNotification('Invalid username or password', 'error');
    }
}

function doLogout() { 
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    logAudit('LOGOUT', `User ${user.username || 'admin'} logged out`);
    saveData(); // Save any pending changes before logout
    localStorage.removeItem('currentUser');
    document.getElementById('dashboardPage').style.display = 'none'; 
    document.getElementById('authPage').style.display = 'grid';
    document.getElementById('loginForm').reset();
}

async function loadData() {
    // Load from localStorage first
    loadDataFromStorage();
    console.log('Loaded from storage:', data);
    
    // Try to sync with API
    try {
        const [c, a, au] = await Promise.all([
            fetch(API + '/customers', { method: 'GET' }).then(r => r.json()),
            fetch(API + '/accounts', { method: 'GET' }).then(r => r.json()),
            fetch(API + '/audit', { method: 'GET' }).then(r => r.json())
        ]);
        if (c && c.length > 0) { data.customers = c; saveData(); }
        if (a && a.length > 0) { data.accounts = a; saveData(); }
        if (au && au.length > 0) { data.audit = au; saveData(); }
    } catch (e) { 
        console.log('API unavailable, using stored data');
    }
    updateDash();
}

function updateDash() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isAdmin = user.role === 'admin';
    
    // Update user display
    if (isAdmin) {
        document.getElementById('userNameDisplay').textContent = 'Administrator';
        document.getElementById('userRoleDisplay').textContent = '(Admin)';
    } else {
        document.getElementById('userNameDisplay').textContent = user.name || user.username;
        document.getElementById('userRoleDisplay').textContent = '(Customer)';
    }
    
    // Show/hide admin buttons
    document.getElementById('addCustomerBtn').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('addAccountBtn').style.display = isAdmin ? 'block' : 'none';
    
    const liq = data.accounts.reduce((s, a) => s + (Number(a.Balance || 0)), 0);
    document.getElementById('totalLiq').textContent = 'Rs. ' + liq.toLocaleString();
    document.getElementById('totalCust').textContent = data.customers.length;
    document.getElementById('totalAcc').textContent = data.accounts.length;
    
    const activity = document.getElementById('recentActivity');
    const recentOps = data.audit && data.audit.length > 0 ? data.audit.slice().reverse().slice(0, 4) : [];
    activity.innerHTML = recentOps.map(op => `
        <div style="display: flex; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(16,185,129,0.2); display: flex; align-items: center; justify-content: center; color: #10b981; font-weight: bold; margin-right: 0.75rem; font-size: 0.85rem;"><i class="fas fa-${op.Operation === 'DEPOSIT' ? 'arrow-down' : op.Operation === 'WITHDRAW' ? 'arrow-up' : op.Operation === 'TRANSFER' ? 'exchange-alt' : 'plus'}"></i></div>
            <div style="flex: 1;">
                <p style="font-size: 0.9rem; font-weight: 500; margin: 0;">${op.Operation}</p>
                <p style="font-size: 0.75rem; color: rgba(107,114,128,1); margin: 0;">${op.Details}</p>
            </div>
            <p style="font-size: 0.75rem; color: rgba(107,114,128,1);">${op.Time.split(', ')[1] || ''}</p>
        </div>
    `).join('') || '<p style="color: rgba(107,114,128,1); text-align: center; padding: 1rem;">No recent activity</p>';
    
    renderCustomers(); renderAccounts(); renderAudit(); initChart();
}

function showDashView(view) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-' + view).style.display = 'block';
    
    // Update active button styling
    document.querySelectorAll('aside button').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = 'rgba(209,213,219,1)';
    });
    
    const viewMap = { 'dashboard': 0, 'customers': 1, 'accounts': 2, 'transactions': 3, 'audit': 4 };
    const navButtons = document.querySelectorAll('aside nav button');
    if (viewMap[view] !== undefined && navButtons[viewMap[view]]) {
        navButtons[viewMap[view]].style.background = 'rgba(16,185,129,0.1)';
        navButtons[viewMap[view]].style.color = '#10b981';
    }
}

function renderCustomers() {
    const tbody = document.getElementById('customersTable');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // If user is not admin, show message
    if (user.role !== 'admin') {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: rgba(107,114,128,1);">Users can only view their own account in the Accounts section</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.customers.map(c => `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer;"><td style="padding: 1rem;">#${c.CustomerID}</td><td style="padding: 1rem; font-weight: 500;">${c.Name}</td><td style="padding: 1rem; color: rgba(107,114,128,1);">${c.CNIC}</td><td style="padding: 1rem;">${c.Contact || '-'}</td><td style="padding: 1rem;"><i class="fas fa-ellipsis-h" style="color: rgba(107,114,128,1); cursor: pointer;"></i></td></tr>`).join('');
}

function renderAccounts() {
    const tbody = document.getElementById('accountsTable');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Filter accounts based on user role
    let accounts = data.accounts;
    if (user.role !== 'admin') {
        // Regular users only see accounts with their username in the name
        accounts = data.accounts.filter(a => a.Name && a.Name.toLowerCase().includes(user.username.toLowerCase()));
    }
    
    tbody.innerHTML = accounts.map(a => `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 1rem; color: #10b981; font-weight: 600;">#${a.AccountNo}</td><td style="padding: 1rem;">${a.Name}</td><td style="padding: 1rem;">${a.Type}</td><td style="padding: 1rem; font-weight: 500;">Rs. ${Number(a.Balance).toLocaleString()}</td><td style="padding: 1rem;"><span style="background: rgba(16,185,129,0.2); color: #10b981; padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500;">Active</span></td></tr>`).join('') || '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: rgba(107,114,128,1);">No accounts found</td></tr>';
}

function renderAudit() {
    const tbody = document.getElementById('auditTable');
    if (!data.audit || data.audit.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: rgba(107,114,128,1);">No audit logs</td></tr>';
        return;
    }
    tbody.innerHTML = data.audit.slice().reverse().map(a => `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);"><td style="padding: 1rem; color: rgba(107,114,128,1); font-size: 0.9rem;">${a.Time}</td><td style="padding: 1rem; color: #10b981; font-weight: 600;">${a.Operation}</td><td style="padding: 1rem;">${a.Details}</td></tr>`).join('');
}

function filterCustomers() {
    const search = document.getElementById('searchCustomer').value.toLowerCase();
    const rows = document.querySelectorAll('#customersTable tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

function handleAddCustomer(e) { 
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (user.role !== 'admin') {
        showNotification('Only administrators can add customers', 'error');
        return;
    }
    
    const name = document.getElementById('custName').value;
    const cnic = document.getElementById('custCNIC').value;
    const contact = document.getElementById('custContact').value;
    const newId = Math.max(...data.customers.map(c => c.CustomerID || 0), 0) + 1;
    data.customers.push({ CustomerID: newId, Name: name, CNIC: cnic, Contact: contact });
    logAudit('CUSTOMER_ADD', `Added customer: ${name}`);
    saveData();
    showNotification('Customer added successfully', 'success');
    closeModal('addCustomerModal');
    e.target.reset();
    updateDash();
}

function handleAddAccount(e) { 
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (user.role !== 'admin') {
        showNotification('Only administrators can create accounts', 'error');
        return;
    }
    
    const custId = document.getElementById('accCustomer').value;
    const type = document.getElementById('accType').value;
    const balance = Number(document.getElementById('accBalance').value);
    const customer = data.customers.find(c => c.CustomerID == custId);
    if (!customer) { showNotification('Please select a customer', 'error'); return; }
    const newAccNo = Math.max(...data.accounts.map(a => a.AccountNo || 0), 0) + 1;
    data.accounts.push({ AccountNo: newAccNo, CustomerID: parseInt(custId), Name: customer.Name, Type: type, Balance: balance, Status: 'Active' });
    logAudit('ACCOUNT_CREATE', `Created ${type} account #${newAccNo} for ${customer.Name}`);
    saveData();
    showNotification('Account added successfully', 'success');
    closeModal('addAccountModal');
    e.target.reset();
    updateDash();
}

function setTransType(type) {
    currentTransType = type;
    document.querySelectorAll('.trans-tab').forEach(t => {
        t.style.background = 'rgba(75,85,99,0.5)';
        t.style.color = 'rgba(209,213,219,1)';
    });
    event.target.style.background = '#10b981';
    event.target.style.color = 'white';
    document.getElementById('transToAccDiv').style.display = type === 'transfer' ? 'block' : 'none';
}

function handleTransaction(e) { 
    e.preventDefault();
    const accNo = Number(document.getElementById('transAccNo').value);
    const amount = Number(document.getElementById('transAmount').value);
    const toAccNo = currentTransType === 'transfer' ? Number(document.getElementById('transToAccNo').value) : null;
    
    const account = data.accounts.find(a => a.AccountNo === accNo);
    if (!account) { showNotification('Account not found', 'error'); return; }
    
    if (currentTransType === 'deposit') {
        account.Balance += amount;
        logAudit('DEPOSIT', `Deposited Rs. ${amount} to Account #${accNo}`);
        showNotification(`Deposit Successful! Amount: Rs. ${amount}. New Balance: Rs. ${account.Balance.toLocaleString()}`, 'success');
    } else if (currentTransType === 'withdraw') {
        if (account.Balance < amount) { showNotification('Insufficient funds!', 'error'); return; }
        account.Balance -= amount;
        logAudit('WITHDRAW', `Withdrew Rs. ${amount} from Account #${accNo}`);
        showNotification(`Withdrawal Successful! Amount: Rs. ${amount}. New Balance: Rs. ${account.Balance.toLocaleString()}`, 'success');
    } else if (currentTransType === 'transfer') {
        const toAccount = data.accounts.find(a => a.AccountNo === toAccNo);
        if (!toAccount) { showNotification('Destination account not found', 'error'); return; }
        if (account.Balance < amount) { showNotification('Insufficient funds!', 'error'); return; }
        account.Balance -= amount;
        toAccount.Balance += amount;
        logAudit('TRANSFER', `Transferred Rs. ${amount} from Account #${accNo} to Account #${toAccNo}`);
        showNotification(`Transfer Successful! Amount: Rs. ${amount}. From: ${accNo} → To: ${toAccNo}. New Balance: Rs. ${account.Balance.toLocaleString()}`, 'success');
    }
    
    saveData();
    e.target.reset();
    updateDash();
}

function logAudit(operation, details) {
    const time = new Date().toLocaleString();
    if (!data.audit) data.audit = [];
    data.audit.push({ LogID: data.audit.length + 1, Operation: operation, TableAffected: 'Transactions', Details: details, Time: time });
}

function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('active');
    if (id === 'addAccountModal') {
        const select = document.getElementById('accCustomer');
        select.innerHTML = '<option value="">Select Customer</option>' + data.customers.map(c => `<option value="${c.CustomerID}">${c.Name}</option>`).join('');
    }
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function initChart() {
    const canvas = document.getElementById('transactionChart');
    if (!canvas) return;
    if (myChart) myChart.destroy();
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Transaction Volume',
                data: [4000, 3000, 2000, 2780, 1890, 2390, 3490],
                borderColor: '#10b981',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                fill: true,
                tension: 0.4,
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(15, 17, 22, 0.95)', titleColor: '#fff', bodyColor: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1, padding: 12, displayColors: false, callbacks: { label: (c) => 'Rs.' + c.parsed.y.toLocaleString() } } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#6b7280' }, beginAtZero: true }, x: { grid: { display: false }, ticks: { color: '#6b7280' } } }
        }
    });
}

function handleMouseMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const spotlight = card.querySelector('#spotlight');
    if (spotlight && x > 0 && y > 0 && x < rect.width && y < rect.height) {
        spotlight.style.background = `radial-gradient(600px circle at ${x}px ${y}px, rgba(16, 185, 129, 0.1), transparent 80%)`;
        spotlight.style.opacity = '1';
    } else if (spotlight) {
        spotlight.style.opacity = '0';
    }
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') && e.target === e.currentTarget) {
        e.target.classList.remove('active');
    }
});
