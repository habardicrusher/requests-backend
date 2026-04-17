const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const USERS_FILE = path.join(__dirname, 'users.json');

(async () => {
    try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch(e) {}
})();

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({
    secret: 'habardicrusher_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ==================== دوال مساعدة ====================
async function loadSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { trucks: [], factories: [] };
    }
}

async function getDayData(date) {
    const filePath = path.join(DATA_DIR, `${date}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return { orders: [], distribution: [] };
        throw err;
    }
}

async function saveDayData(date, data) {
    const filePath = path.join(DATA_DIR, `${date}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ==================== إدارة المستخدمين ====================
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // إنشاء المستخدمين الافتراضيين مع تشفير كلمات المرور
        const defaultUsers = {
            "admin": {
                id: 1,
                username: "admin",
                password: bcrypt.hashSync("admin", 10),
                role: "admin",
                factory: null,
                created_at: new Date().toISOString()
            },
            "user": {
                id: 2,
                username: "user",
                password: bcrypt.hashSync("user", 10),
                role: "user",
                factory: null,
                created_at: new Date().toISOString()
            },
            "client": {
                id: 3,
                username: "client",
                password: bcrypt.hashSync("client", 10),
                role: "client",
                factory: "مصنع الفهد",
                created_at: new Date().toISOString()
            }
        };
        await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        return defaultUsers;
    }
}

async function saveUsers(usersObj) {
    await fs.writeFile(USERS_FILE, JSON.stringify(usersObj, null, 2));
}

function usersObjectToArray(usersObj) {
    return Object.values(usersObj).map(({ password, ...rest }) => rest);
}

function getNextId(usersObj) {
    const ids = Object.values(usersObj).map(u => u.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
}

// ==================== Endpoints ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبة' });
        }
        const usersObj = await loadUsers();
        const user = usersObj[username];
        if (!user) {
            return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور غير صحيحة' });
        }
        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'اسم مستخدم أو كلمة مرور غير صحيحة' });
        }
        req.session.userId = username;
        req.session.role = user.role;
        res.json({ success: true, role: user.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ داخلي في الخادم' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/me', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'غير مصرح' });
    }
    const usersObj = await loadUsers();
    const user = usersObj[req.session.userId];
    if (!user) {
        return res.status(401).json({ error: 'غير مصرح' });
    }
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

// إدارة المستخدمين (للمدير فقط)
app.get('/api/users', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    const usersObj = await loadUsers();
    res.json(usersObjectToArray(usersObj));
});

app.post('/api/users', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    const { username, password, role, factory } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبة' });
    }
    const usersObj = await loadUsers();
    if (usersObj[username]) {
        return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    const newId = getNextId(usersObj);
    usersObj[username] = {
        id: newId,
        username,
        password: bcrypt.hashSync(password, 10),
        role: role || 'user',
        factory: (role === 'client' && factory) ? factory : null,
        created_at: new Date().toISOString()
    };
    await saveUsers(usersObj);
    res.status(201).json({ success: true, id: newId });
});

app.put('/api/users/:id', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    const targetId = parseInt(req.params.id);
    const { username, role, password, factory } = req.body;
    const usersObj = await loadUsers();
    let foundKey = null, foundUser = null;
    for (const [key, user] of Object.entries(usersObj)) {
        if (user.id === targetId) {
            foundKey = key;
            foundUser = user;
            break;
        }
    }
    if (!foundUser) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    if (username && username !== foundKey) {
        delete usersObj[foundKey];
        foundUser.username = username;
        usersObj[username] = foundUser;
        foundKey = username;
    } else if (username) {
        foundUser.username = username;
    }
    if (role) foundUser.role = role;
    if (password) foundUser.password = bcrypt.hashSync(password, 10);
    if (role === 'client' && factory) foundUser.factory = factory;
    else if (role !== 'client') foundUser.factory = null;
    
    usersObj[foundKey] = foundUser;
    await saveUsers(usersObj);
    res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'غير مصرح' });
    }
    const targetId = parseInt(req.params.id);
    const usersObj = await loadUsers();
    let foundKey = null;
    for (const [key, user] of Object.entries(usersObj)) {
        if (user.id === targetId) {
            foundKey = key;
            break;
        }
    }
    if (!foundKey) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (foundKey === 'admin') return res.status(400).json({ error: 'لا يمكن حذف المستخدم admin' });
    delete usersObj[foundKey];
    await saveUsers(usersObj);
    res.json({ success: true });
});

// باقي endpoints النظام
app.get('/api/settings', async (req, res) => {
    const settings = await loadSettings();
    res.json(settings);
});

app.get('/api/day/:date', async (req, res) => {
    const { date } = req.params;
    const data = await getDayData(date);
    res.json(data);
});

app.put('/api/day/:date', async (req, res) => {
    const { date } = req.params;
    await saveDayData(date, req.body);
    res.json({ success: true });
});

app.get('/api/range/:startDate/:endDate', async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ error: 'تواريخ غير صالحة' });
        }
        const dates = [];
        let current = new Date(start);
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        const results = {};
        for (const date of dates) {
            results[date] = await getDayData(date);
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'خطأ داخلي' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`👤 بيانات الدخول: admin/admin , user/user , client/client`);
});