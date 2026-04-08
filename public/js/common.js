// js/common.js
let currentUser = null;

const allPermissions = {
    viewOrders: '📋 عرض الطلبات',
    addOrders: '➕ إضافة طلبات',
    editOrders: '✏️ تعديل الطلبات',
    deleteOrders: '🗑️ حذف الطلبات',
    viewDistribution: '🚚 عرض التوزيع',
    manageDistribution: '⚡ إدارة التوزيع',
    viewTrucks: '🚛 عرض السيارات',
    manageTrucks: '🔧 إدارة السيارات',
    viewReports: '📊 عرض التقارير',
    exportReports: '📥 تصدير التقارير',
    viewSettings: '⚙️ عرض الإعدادات',
    manageSettings: '🔧 إدارة الإعدادات',
    manageUsers: '👥 إدارة المستخدمين',
    manageRestrictions: '⛔ إدارة القيود'
};

function showLoading(show) {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex'; // تأكيد الإظهار بقوة
        modal.classList.add('active');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

async function checkSession() {
    try {
        const user = await apiCall('/auth/me'); 
        if (user) {
            currentUser = user;
            return true;
        }
    } catch (e) { console.log("No session"); }
    window.location.href = 'login.html';
    return false;
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('currentUsername').textContent = currentUser.username;
        const roleEl = document.getElementById('userRole');
        roleEl.textContent = currentUser.role === 'admin' ? '👑 مدير' : '👤 مستخدم';
        roleEl.className = `chip ${currentUser.role}`;
    }
}

function logout() {
    apiCall('/auth/logout', 'POST').then(() => {
        window.location.href = 'login.html';
    });
}
