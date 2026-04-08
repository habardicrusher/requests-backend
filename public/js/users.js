// js/users.js
document.addEventListener('DOMContentLoaded', async function() {
    showLoading(true);
    const hasSession = await checkSession();
    if (hasSession) {
        if (!currentUser.permissions.manageUsers) {
            showToast('ليس لديك صلاحية', 'error');
            setTimeout(() => window.location.href = 'orders.html', 2000);
            return;
        }
        updateUserInfo();
        if (typeof buildNavigation === 'function') buildNavigation();
        await loadUsers();
    }
    showLoading(false);
});

async function loadUsers() {
    try {
        const users = await apiCall('/users');
        const container = document.getElementById('usersList');
        if (!container) return;
        
        container.innerHTML = users.map(u => `
            <div class="list-item">
                <div>
                    <strong>👤 ${u.username}</strong>
                    <span class="chip ${u.role}">${u.role === 'admin' ? '👑 مدير' : '👤 مستخدم'}</span>
                </div>
                <div>
                    <button class="btn btn-sm btn-warning" onclick="openEditUserModal(${u.id})">✏️</button>
                    ${u.username !== 'Admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (e) { showToast('خطأ في تحميل المستخدمين', 'error'); }
}

function openAddUserModal() {
    document.getElementById('userModalTitle').textContent = '➕ إضافة مستخدم جديد';
    document.getElementById('userEditId').value = '';
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newUserRole').value = 'user';
    renderPermissionsCheckboxes({});
    openModal('userModal');
}

function renderPermissionsCheckboxes(currentPerms) {
    const container = document.getElementById('permissionsCheckboxes');
    container.innerHTML = Object.entries(allPermissions).map(([key, label]) => `
        <label style="display:block; margin: 5px 0;">
            <input type="checkbox" id="perm_${key}" ${currentPerms[key] ? 'checked' : ''}> ${label}
        </label>
    `).join('');
}

async function saveUser() {
    const id = document.getElementById('userEditId').value;
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newUserRole').value;

    if (!username) return showToast('أدخل اسم المستخدم', 'error');

    const permissions = {};
    Object.keys(allPermissions).forEach(key => {
        permissions[key] = document.getElementById(`perm_${key}`).checked;
    });

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/users/${id}` : '/users';
        await apiCall(url, method, { username, password, role, permissions });
        showToast('تم الحفظ بنجاح', 'success');
        closeModal('userModal');
        loadUsers();
    } catch (e) { showToast(e.message, 'error'); }
}
