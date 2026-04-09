const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data'); // مجلد لحفظ الملفات

// التأكد من وجود مجلد البيانات
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// قراءة أو إنشاء ملف users.json
async function loadUsers() {
    const usersPath = path.join(DATA_DIR, 'users.json');
    try {
        const data = await fs.readFile(usersPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        // إنشاء مستخدم Admin افتراضي بكلمة مرور مشفرة (Live#5050)
        const hashedPassword = await bcrypt.hash('Live#5050', 10);
        const defaultUsers = [
            { id: 1, username: 'Admin', password: hashedPassword, role: 'admin', createdAt: new Date().toISOString() }
        ];
        await fs.writeFile(usersPath, JSON.stringify(defaultUsers, null, 2));
        return defaultUsers;
    }
}

// حفظ المستخدمين
async function saveUsers(users) {
    const usersPath = path.join(DATA_DIR, 'users.json');
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
}

// تحميل بيانات يوم معين
async function loadDayData(date) {
    const filePath = path.join(DATA_DIR, `${date}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { orders: [], distribution: [] };
    }
}

// حفظ بيانات يوم
async function saveDayData(date, data) {
    const filePath = path.join(DATA_DIR, `${date}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// تحميل إعدادات النظام (factories, materials, trucks)
async function loadSettings() {
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    try {
        const data = await fs.readFile(settingsPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        const defaultSettings = {
            factories: ['مصنع الرياض', 'مصنع الدمام', 'مصنع جدة'],
            materials: ['3/4', '3/8', '3/16', 'بحص خرسانة'],
            trucks: [
                { number: '1', driver: 'سائق 1' },
                { number: '2', driver: 'سائق 2' },
                { number: '3', driver: 'سائق 3' }
            ]
        };
        await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2));
        return defaultSettings;
    }
}

// تحميل قيود الحظر
async function loadRestrictions() {
    const restrictionsPath = path.join(DATA_DIR, 'restrictions.json');
    try {
        const data = await fs.readFile(restrictionsPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveRestrictions(restrictions) {
    const restrictionsPath = path.join(DATA_DIR, 'restrictions.json');
    await fs.writeFile(restrictionsPath, JSON.stringify(restrictions, null, 2));
}

// ========== Middleware ==========
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // لخدمة الملفات الثابتة (HTML, CSS, JS)
app.use(session({
    secret: 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 يوم
}));

// ========== API Routes ==========

// الحصول على معلومات المستخدم الحالي
app.get('/api/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مسجل دخول' });
    const users = await loadUsers();
    const user = users.find(u => u.id === req.session.userId);
    if (!user) return res.status(401).json({ error: 'مستخدم غير موجود' });
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور خاطئة' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور خاطئة' });
    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

// تسجيل الخروج
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// الحصول على الإعدادات
app.get('/api/settings', async (req, res) => {
    const settings = await loadSettings();
    res.json(settings);
});

// تحديث الإعدادات (إذا لزم الأمر)
app.put('/api/settings', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const users = await loadUsers();
    const currentUser = users.find(u => u.id === req.session.userId);
    if (currentUser.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const newSettings = req.body;
    const settingsPath = path.join(DATA_DIR, 'settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(newSettings, null, 2));
    res.json({ success: true });
});

// الحصول على بيانات يوم
app.get('/api/day/:date', async (req, res) => {
    const date = req.params.date;
    const data = await loadDayData(date);
    res.json(data);
});

// حفظ بيانات يوم (مع دعم حقل time في الطلبات)
app.put('/api/day/:date', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const date = req.params.date;
    let { orders, distribution } = req.body;
    // التأكد من أن كل طلب يحتوي على حقل time (حتى لو كان فارغاً)
    orders = orders.map(order => ({
        id: order.id,
        factory: order.factory,
        material: order.material,
        time: order.time || '',   // <-- حفظ الوقت
        timestamp: order.timestamp || new Date().toLocaleTimeString('ar-SA')
    }));
    await saveDayData(date, { orders, distribution });
    res.json({ success: true });
});

// الحصول على قائمة المستخدمين (للمدير فقط)
app.get('/api/users', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const users = await loadUsers();
    const currentUser = users.find(u => u.id === req.session.userId);
    if (currentUser.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    // إخفاء كلمات المرور
    const safeUsers = users.map(u => ({ ...u, password: undefined }));
    res.json(safeUsers);
});

// إضافة مستخدم جديد (للمدير فقط)
app.post('/api/users', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const users = await loadUsers();
    const currentUser = users.find(u => u.id === req.session.userId);
    if (currentUser.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const { username, password, role, permissions } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبة' });
    const existing = users.find(u => u.username === username);
    if (existing) return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now(),
        username,
        password: hashedPassword,
        role: role || 'user',
        permissions: permissions || {},
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    await saveUsers(users);
    res.json({ success: true, user: { ...newUser, password: undefined } });
});

// تحديث مستخدم (تغيير الدور، كلمة المرور، الصلاحيات)
app.put('/api/users/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const users = await loadUsers();
    const currentUser = users.find(u => u.id === req.session.userId);
    if (currentUser.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const userId = parseInt(req.params.id);
    const { username, role, password, permissions } = req.body;
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return res.status(404).json({ error: 'مستخدم غير موجود' });
    if (username) users[userIndex].username = username;
    if (role) users[userIndex].role = role;
    if (password) {
        users[userIndex].password = await bcrypt.hash(password, 10);
    }
    if (permissions) users[userIndex].permissions = permissions;
    await saveUsers(users);
    res.json({ success: true });
});

// حذف مستخدم
app.delete('/api/users/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const users = await loadUsers();
    const currentUser = users.find(u => u.id === req.session.userId);
    if (currentUser.role !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    const userId = parseInt(req.params.id);
    if (userId === currentUser.id) return res.status(400).json({ error: 'لا يمكن حذف حسابك الحالي' });
    const newUsers = users.filter(u => u.id !== userId);
    await saveUsers(newUsers);
    res.json({ success: true });
});

// ========== قيود الحظر ==========
app.get('/api/restrictions', async (req, res) => {
    const restrictions = await loadRestrictions();
    res.json(restrictions);
});

app.post('/api/restrictions', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const restrictions = await loadRestrictions();
    const newRestriction = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
    restrictions.push(newRestriction);
    await saveRestrictions(restrictions);
    res.json(newRestriction);
});

app.put('/api/restrictions/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const id = parseInt(req.params.id);
    const restrictions = await loadRestrictions();
    const index = restrictions.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ error: 'غير موجود' });
    restrictions[index] = { ...restrictions[index], ...req.body };
    await saveRestrictions(restrictions);
    res.json(restrictions[index]);
});

app.delete('/api/restrictions/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'غير مصرح' });
    const id = parseInt(req.params.id);
    let restrictions = await loadRestrictions();
    restrictions = restrictions.filter(r => r.id !== id);
    await saveRestrictions(restrictions);
    res.json({ success: true });
});

// ========== تقارير ==========
app.get('/api/reports', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'يرجى تحديد الفترة' });
    const allDistributions = [];
    const dailyData = {};
    const driverStats = {};
    const factoryStats = {};
    const materialStats = {};

    // قراءة جميع الأيام بين startDate و endDate
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayData = await loadDayData(dateStr);
        const distributions = dayData.distribution || [];
        distributions.forEach(d => {
            d.date = dateStr;
            allDistributions.push(d);
            dailyData[dateStr] = (dailyData[dateStr] || 0) + 1;
            const driverKey = d.truck?.number;
            if (driverKey) {
                if (!driverStats[driverKey]) driverStats[driverKey] = { number: driverKey, driver: d.truck.driver, total: 0 };
                driverStats[driverKey].total++;
            }
            const factory = d.factory;
            if (factory) {
                if (!factoryStats[factory]) factoryStats[factory] = { name: factory, total: 0 };
                factoryStats[factory].total++;
            }
            const material = d.material;
            if (material) {
                if (!materialStats[material]) materialStats[material] = { name: material, total: 0 };
                materialStats[material].total++;
            }
        });
        current.setDate(current.getDate() + 1);
    }

    res.json({
        allDistributions,
        dailyData,
        driverStats: Object.values(driverStats),
        factoryStats: Object.values(factoryStats),
        materialStats: Object.values(materialStats)
    });
});

// ========== تشغيل السيرفر ==========
ensureDataDir().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
});
