const { pool } = require('../db');
const bcrypt = require('bcryptjs');

// دالة مساعدة لتحويل JSON string إلى مصفوفة
function parsePermissions(permissionsStr) {
    if (!permissionsStr) return [];
    try {
        const parsed = JSON.parse(permissionsStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

// دالة مساعدة لتحويل مصفوفة إلى JSON string للتخزين
function stringifyPermissions(permissionsArr) {
    if (!permissionsArr || !Array.isArray(permissionsArr)) return '[]';
    return JSON.stringify(permissionsArr);
}

async function getUserByUsername(username) {
    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (res.rows[0]) {
        const user = res.rows[0];
        user.permissions = parsePermissions(user.permissions);
        return user;
    }
    return null;
}

async function getUsers() {
    const res = await pool.query('SELECT id, username, role, factory, permissions, created_at FROM users');
    return res.rows.map(user => ({
        ...user,
        permissions: parsePermissions(user.permissions)
    }));
}

async function createUser(username, password, role, factory, permissions) {
    const hashed = await bcrypt.hash(password, 10);
    const permissionsStr = stringifyPermissions(permissions);
    const res = await pool.query(
        `INSERT INTO users (username, password, role, factory, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, hashed, role, factory, permissionsStr]
    );
    return res.rows[0];
}

async function updateUser(id, username, role, factory, permissions, newPassword = null) {
    let query = 'UPDATE users SET username = $1, role = $2, factory = $3, permissions = $4';
    let params = [username, role, factory, stringifyPermissions(permissions)];
    if (newPassword) {
        const hashed = await bcrypt.hash(newPassword, 10);
        query += ', password = $5';
        params.push(hashed);
    }
    query += ' WHERE id = $' + (params.length + 1);
    params.push(id);
    await pool.query(query, params);
}

async function deleteUser(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

// إضافة دالة للحصول على قائمة الصلاحيات المتاحة (اختياري)
function getAvailablePermissions() {
    return [
        'view_orders', 'create_order', 'edit_order', 'delete_order',
        'view_distribution', 'edit_distribution',
        'view_trucks', 'edit_trucks',
        'view_products', 'edit_products',
        'view_factories', 'edit_factories',
        'view_reports', 'view_scale_report', 'view_failed_trucks',
        'view_settings', 'manage_users', 'view_logs'
    ];
}

module.exports = { 
    getUserByUsername, 
    getUsers, 
    createUser, 
    updateUser, 
    deleteUser,
    getAvailablePermissions,
    parsePermissions,
    stringifyPermissions
};
