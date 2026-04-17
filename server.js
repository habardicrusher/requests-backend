require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({
    secret: process.env.SESSION_SECRET || 'habardicrusher_secret_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ==================== دوال مساعدة ====================
async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (err) {
        console.error('خطأ في الاستعلام:', err);
        throw err;
    }
}

// ==================== إنشاء الجداول ====================
async function initTables() {
    // جدول الإعدادات (السيارات والمصانع)
    await query(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL
        )
    `);
    // جدول المنتجات (أنواع البحص)
    await query(`
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    // جدول بيانات الميزان الشهرية
    await query(`
        CREATE TABLE IF NOT EXISTS scale_data (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            data JSONB NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(year, month)
        )
    `);
    // جدول بيانات اليوم (الطلبات والتوزيع)
    await query(`
        CREATE TABLE IF NOT EXISTS day_data (
            date DATE PRIMARY KEY,
            orders JSONB NOT NULL,
            distribution JSONB NOT NULL
        )
    `);
    // جدول المستخدمين
    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            factory TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `);
    
    // إضافة المستخدمين الافتراضيين إذا لم يوجد أحد
    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
        await query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['admin', bcrypt.hashSync('admin', 10), 'admin']);
        await query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['user', bcrypt.hashSync('user', 10), 'user']);
        await query('INSERT INTO users (username, password, role, factory) VALUES ($1, $2, $3, $4)', ['client', bcrypt.hashSync('client', 10), 'client', 'مصنع الفهد']);
        console.log('✅ تم إنشاء المستخدمين الافتراضيين');
    }
}
initTables().catch(console.error);

// ==================== ترحيل البيانات من الملفات القديمة ====================
async function migrateSettings() {
    const existing = await query(`SELECT value FROM settings WHERE key = 'settings'`);
    if (existing.rows.length === 0) {
        try {
            const data = await fs.readFile(path.join(__dirname, 'settings.json'), 'utf8');
            const settings = JSON.parse(data);
            await query(`INSERT INTO settings (key, value) VALUES ('settings', $1)`, [settings]);
            console.log('✅ تم ترحيل الإعدادات من settings.json');
        } catch (err) { console.log('لا يوجد ملف settings.json قديم'); }
    }
}

async function migrateProducts() {
    const count = await query('SELECT COUNT(*) FROM products');
    if (parseInt(count.rows[0].count) === 0) {
        try {
            const data = await fs.readFile(path.join(__dirname, 'products.json'), 'utf8');
            const products = JSON.parse(data);
            for (const p of products) {
                await query('INSERT INTO products (name) VALUES ($1) ON CONFLICT DO NOTHING', [p.name || p]);
            }
            console.log('✅ تم ترحيل أنواع البحص من products.json');
        } catch (err) { console.log('لا يوجد ملف products.json قديم'); }
    }
}

async function migrateScaleData() {
    const files = await fs.readdir(__dirname).catch(() => []);
    const scaleFiles = files.filter(f => f.startsWith('scale_') && f.endsWith('.json'));
    for (const file of scaleFiles) {
        const match = file.match(/scale_(\d{4})_(\d{2})\.json/);
        if (match) {
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const existing = await query('SELECT id FROM scale_data WHERE year = $1 AND month = $2', [year, month]);
            if (existing.rows.length === 0) {
                try {
                    const data = await fs.readFile(path.join(__dirname, file), 'utf8');
                    const jsonData = JSON.parse(data);
                    await query('INSERT INTO scale_data (year, month, data) VALUES ($1, $2, $3)', [year, month, jsonData]);
                    console.log(`✅ تم ترحيل بيانات الميزان لشهر ${month}/${year}`);
                } catch (err) { console.error(`فشل ترحيل ${file}:`, err.message); }
            }
        }
    }
}

// تشغيل الترحيل بعد إنشاء الجداول
setTimeout(() => {
    migrateSettings().catch(console.error);
    migrateProducts().catch(console.error);
    migrateScaleData().catch(console.error);
}, 2000);

// ==================== Endpoints العامة ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'مطلوب' });
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];
        if (!user || !bcrypt.compareSync(password, user.password)) 
            return res.status(401).json({ error: 'بيانات غير صحيحة' });
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        res.json({ success: true, role: user.role });
    } catch (err) {
        res.status(500).json({ error: 'خطأ داخلي' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const result = await query('SELECT id, username, role FROM users WHERE id = $1', [req.session.userId]);
    if (!result.rows.length) return res.status(401).json({ error: 'غير مصرح' });
    res.json({ user: result.rows[0] });
});

// ==================== إدارة المستخدمين ====================
app.get('/api/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const result = await query('SELECT id, username, role, factory, created_at FROM users ORDER BY id');
    res.json(result.rows);
});

app.post('/api/users', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const { username, password, role, factory } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'مطلوب' });
    const exists = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (exists.rows.length) return res.status(400).json({ error: 'موجود' });
    const hashed = bcrypt.hashSync(password, 10);
    const finalRole = role || 'user';
    const finalFactory = (finalRole === 'client' && factory) ? factory : null;
    await query('INSERT INTO users (username, password, role, factory) VALUES ($1, $2, $3, $4)', [username, hashed, finalRole, finalFactory]);
    res.status(201).json({ success: true });
});

app.put('/api/users/:id', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const userId = parseInt(req.params.id);
    const { role, password, factory } = req.body;
    const updates = [], values = [];
    if (role) { updates.push(`role = $${updates.length+1}`); values.push(role); }
    if (password) { updates.push(`password = $${updates.length+1}`); values.push(bcrypt.hashSync(password, 10)); }
    if (role === 'client' && factory !== undefined) { updates.push(`factory = $${updates.length+1}`); values.push(factory); }
    else if (role !== 'client') { updates.push(`factory = NULL`); }
    if (updates.length === 0) return res.json({ success: true });
    values.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const userId = parseInt(req.params.id);
    const user = await query('SELECT username FROM users WHERE id = $1', [userId]);
    if (!user.rows.length) return res.status(404).json({ error: 'غير موجود' });
    if (user.rows[0].username === 'admin') return res.status(400).json({ error: 'لا يمكن حذف المدير' });
    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true });
});

// ==================== الإعدادات (السيارات والمصانع) ====================
app.get('/api/settings', async (req, res) => {
    const result = await query(`SELECT value FROM settings WHERE key = 'settings'`);
    if (result.rows.length) res.json(result.rows[0].value);
    else res.json({ trucks: [], factories: [] });
});

app.put('/api/settings', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    await query(`INSERT INTO settings (key, value) VALUES ('settings', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [req.body]);
    res.json({ success: true });
});

// ==================== المنتجات (أنواع البحص) ====================
app.get('/api/products', async (req, res) => {
    const result = await query('SELECT name FROM products ORDER BY id');
    res.json(result.rows.map(r => r.name));
});

app.post('/api/products', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم المنتج مطلوب' });
    await query('INSERT INTO products (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    res.status(201).json({ success: true });
});

app.delete('/api/products/:name', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const { name } = req.params;
    await query('DELETE FROM products WHERE name = $1', [name]);
    res.json({ success: true });
});

// ==================== بيانات الميزان الشهرية ====================
app.get('/api/scale/monthly/:year/:month', async (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const result = await query('SELECT data FROM scale_data WHERE year = $1 AND month = $2', [year, month]);
    if (result.rows.length) res.json(result.rows[0].data);
    else res.json({});
});

app.put('/api/scale/monthly/:year/:month', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const data = req.body;
    await query(`INSERT INTO scale_data (year, month, data) VALUES ($1, $2, $3) ON CONFLICT (year, month) DO UPDATE SET data = $3, updated_at = NOW()`, [year, month, data]);
    res.json({ success: true });
});

// ==================== بيانات اليوم (الطلبات والتوزيع) ====================
app.get('/api/day/:date', async (req, res) => {
    const { date } = req.params;
    const result = await query('SELECT orders, distribution FROM day_data WHERE date = $1', [date]);
    if (result.rows.length) res.json(result.rows[0]);
    else res.json({ orders: [], distribution: [] });
});

app.put('/api/day/:date', async (req, res) => {
    const { date } = req.params;
    const { orders, distribution } = req.body;
    await query(`INSERT INTO day_data (date, orders, distribution) VALUES ($1, $2, $3) ON CONFLICT (date) DO UPDATE SET orders = $2, distribution = $3`, [date, orders, distribution]);
    res.json({ success: true });
});

app.get('/api/range/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
    const result = await query(`SELECT date, orders, distribution FROM day_data WHERE date BETWEEN $1 AND $2 ORDER BY date`, [startDate, endDate]);
    const data = {};
    result.rows.forEach(row => { data[row.date] = { orders: row.orders, distribution: row.distribution }; });
    res.json(data);
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`👤 admin/admin , user/user , client/client`);
});