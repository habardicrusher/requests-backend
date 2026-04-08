const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// ==================== CORS (GitHub Pages -> Render) ====================
// ضع في Render: FRONTEND_ORIGIN = https://habardicrusher.github.io
// (بدون /requests)
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'https://habardicrusher.github.io')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like curl/postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true
}));

// ==================== Body Parsers ====================
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ==================== Session ====================
const isProd = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-render',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,                 // true على Render (HTTPS)
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax', // مهم لأن الواجهة على دومين مختلف
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ==================== المجلدات ====================
const DATA_DIR = path.join(__dirname, 'data');
const DAYS_DIR = path.join(DATA_DIR, 'days');

// إنشاء المجلدات إذا لم تكن موجودة
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DAYS_DIR)) fs.mkdirSync(DAYS_DIR, { recursive: true });

// ==================== البيانات الافتراضية الحقيقية ====================
const defaultSettings = {
  factories: [
    'SCCCL',
    'الحارث للمنتجات الاسمنيه',
    'الحارثي القديم',
    'المعجل لمنتجات الاسمنت',
    'الحارث العزيزية',
    'سارمكس النظيم',
    'عبر الخليج',
    'الكفاح للخرسانة الجاهزة',
    'القيشان 3',
    'القيشان 2 - الأحجار الشرقية',
    'القيشان 1',
    'الفهد للبلوك والخرسانة'
  ],
  materials: ['3/4', '3/8', '3/16'],
  trucks: [
    { number: '1091', driver: 'سينج' },
    { number: '2757', driver: 'انيس' },
    { number: '2758', driver: 'عارف' },
    { number: '2759', driver: 'عتيق الاسلام' },
    { number: '2760', driver: 'سليمان' },
    { number: '2762', driver: 'زرداد' },
    { number: '2818', driver: 'شهداب' },
    { number: '2927', driver: 'مدثر' },
    { number: '2928', driver: 'سمر اقبال' },
    { number: '2929', driver: 'عرفان شبير' },
    { number: '3321', driver: 'وقاص' },
    { number: '3322', driver: 'نعيم' },
    { number: '3324', driver: 'محمد كليم' },
    { number: '3325', driver: 'احسان' },
    { number: '3326', driver: 'نويد' },
    { number: '3461', driver: 'جيفان كومار' },
    { number: '3462', driver: 'افتخار' },
    { number: '3963', driver: 'شكيل' },
    { number: '4445', driver: 'عرفان' },
    { number: '5324', driver: 'بابر' },
    { number: '5367', driver: 'سلفر تان' },
    { number: '5520', driver: 'نابين' },
    { number: '5521', driver: 'فضل' },
    { number: '5522', driver: 'عبيدالله' },
    { number: '5523', driver: 'محمد فيصل' },
    { number: '5524', driver: 'بير محمد' },
    { number: '5525', driver: 'صدير الاسلام' },
    { number: '5526', driver: 'محمد عبدو' },
    { number: '5527', driver: 'سكير' },
    { number: '5528', driver: 'تشاندان' },
    { number: '5658', driver: 'مسعود خان' },
    { number: '5796', driver: 'ساهيل طارق' },
    { number: '5797', driver: 'عبد القادر' },
    { number: '5800', driver: 'غوا محمد' },
    { number: '6398', driver: 'نديم خان' },
    { number: '6428', driver: 'برديب' },
    { number: '6429', driver: 'طاهر' },
    { number: '6430', driver: 'سليمان غولزار' },
    { number: '6432', driver: 'برويز اختر' },
    { number: '6612', driver: 'ذو القرنين' },
    { number: '6613', driver: 'نظيم خان' },
    { number: '6614', driver: 'فينود' },
    { number: '6615', driver: 'رسول' },
    { number: '6616', driver: 'يعقوب' },
    { number: '6617', driver: 'اظهر' },
    { number: '6618', driver: 'عثمان' },
    { number: '6619', driver: 'مينا خان' },
    { number: '6620', driver: 'محمد ساحل' },
    { number: '6621', driver: 'اسد' },
    { number: '6622', driver: 'مانوج' },
    { number: '6623', driver: 'خالد رحمان' },
    { number: '6624', driver: 'هداية' },
    { number: '6626', driver: 'HARENDRA' },
    { number: '6629', driver: 'جاويد' },
    { number: '6935', driver: 'تيمور' },
    { number: '6939', driver: 'ارشد' },
    { number: '7042', driver: 'فيراس' },
    { number: '7043', driver: 'ايوب خان' },
    { number: '7332', driver: 'علي رضا' },
    { number: '7682', driver: 'خالد' },
    { number: '7750', driver: 'نديم' },
    { number: '7837', driver: 'ارسلان' },
    { number: '7926', driver: 'سجاد' },
    { number: '7927', driver: 'اكبر' },
    { number: '7928', driver: 'امير' },
    { number: '7929', driver: 'طاهر محمود' },
    { number: '7930', driver: 'ناريندر' },
    { number: '7974', driver: 'شريف' },
    { number: '7980', driver: 'شعيب' },
    { number: '9103', driver: 'ساكب' },
    { number: '9492', driver: 'عدنان' },
    { number: '9493', driver: 'عامر' },
    { number: '9495', driver: 'ميزان' },
    { number: '9496', driver: 'غفور احمد' }
  ]
};

// ==================== Helper Functions ====================
function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  return null;
}

function writeJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

function readDayData(date) {
  const filepath = path.join(DAYS_DIR, `${date}.json`);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  return { orders: [], distribution: [] };
}

function writeDayData(date, data) {
  const filepath = path.join(DAYS_DIR, `${date}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

function addLog(user, action, details = '') {
  let logs = readJSON('logs.json') || [];
  logs.unshift({
    id: Date.now(),
    user,
    action,
    details,
    timestamp: new Date().toISOString()
  });
  logs = logs.slice(0, 500);
  writeJSON('logs.json', logs);
}

// ==================== تهيئة البيانات الافتراضية ====================
function initializeData() {
  // المستخدمين
  if (!readJSON('users.json')) {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    writeJSON('users.json', [{
      id: 1,
      username: 'Admin',
      password: adminPassword,
      role: 'admin',
      permissions: {
        viewOrders: true, addOrders: true, editOrders: true, deleteOrders: true,
        viewDistribution: true, manageDistribution: true,
        viewTrucks: true, manageTrucks: true,
        viewReports: true, exportReports: true,
        viewSettings: true, manageSettings: true,
        viewBackup: true, manageBackup: true,
        manageUsers: true, manageRestrictions: true
      },
      createdAt: new Date().toISOString()
    }]);
    console.log('✅ تم إنشاء حساب المدير: Admin / admin123');
  }

  // الإعدادات
  if (!readJSON('settings.json')) {
    writeJSON('settings.json', defaultSettings);
    console.log('✅ تم إنشاء الإعدادات الافتراضية');
  }

  if (!readJSON('restrictions.json')) writeJSON('restrictions.json', []);
  if (!readJSON('logs.json')) writeJSON('logs.json', []);
}

initializeData();

// ==================== Middleware للتحقق من الجلسة ====================
function requireAuth(req, res, next) {
  if (req.session && req.session.user) next();
  else res.status(401).json({ error: 'غير مصرح' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') next();
  else res.status(403).json({ error: 'صلاحيات المدير مطلوبة' });
}

// ==================== Health Check ====================
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'requests-backend' });
});

// ==================== API: المصادقة ====================

// تسجيل الدخول
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const users = readJSON('users.json') || [];
  const user = users.find(u => u.username.toLowerCase() === String(username || '').toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const passwordMatch = bcrypt.compareSync(String(password || ''), user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions
  };

  addLog(user.username, 'تسجيل دخول');
  res.json({ success: true, user: req.session.user });
});

// تسجيل الخروج
app.post('/api/logout', (req, res) => {
  const u = req.session?.user?.username;
  if (u) addLog(u, 'تسجيل خروج');

  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// معلومات المستخدم الحالي
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// ==================== API: الإعدادات ====================
app.get('/api/settings', requireAuth, (req, res) => {
  const settings = readJSON('settings.json') || defaultSettings;
  res.json(settings);
});

app.put('/api/settings', requireAuth, (req, res) => {
  const { factories, materials, trucks } = req.body;
  writeJSON('settings.json', { factories, materials, trucks });
  addLog(req.session.user.username, 'تحديث الإعدادات');
  res.json({ success: true });
});

// ==================== API: بيانات اليوم ====================
app.get('/api/day/:date', requireAuth, (req, res) => {
  const data = readDayData(req.params.date);
  res.json(data);
});

app.put('/api/day/:date', requireAuth, (req, res) => {
  const { orders, distribution } = req.body;
  writeDayData(req.params.date, { orders, distribution });
  res.json({ success: true });
});

// ==================== API: المستخدمين ====================
app.get('/api/users', requireAuth, (req, res) => {
  const users = readJSON('users.json') || [];
  const safeUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    permissions: u.permissions,
    createdAt: u.createdAt
  }));
  res.json(safeUsers);
});

app.post('/api/users', requireAuth, (req, res) => {
  if (!req.session.user.permissions.manageUsers) {
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  }

  const { username, password, role, permissions } = req.body;
  const users = readJSON('users.json') || [];

  if (users.some(u => u.username.toLowerCase() === String(username || '').toLowerCase())) {
    return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
  }

  const newUser = {
    id: Date.now(),
    username,
    password: bcrypt.hashSync(password, 10),
    role,
    permissions,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJSON('users.json', users);
  addLog(req.session.user.username, 'إضافة مستخدم', username);

  res.json({ success: true, id: newUser.id });
});

app.put('/api/users/:id', requireAuth, (req, res) => {
  if (!req.session.user.permissions.manageUsers) {
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  }

  const id = parseInt(req.params.id);
  const { username, password, role, permissions } = req.body;
  const users = readJSON('users.json') || [];

  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: 'المستخدم غير موجود' });

  users[index].username = username;
  users[index].role = role;
  users[index].permissions = permissions;

  if (password) users[index].password = bcrypt.hashSync(password, 10);

  writeJSON('users.json', users);
  addLog(req.session.user.username, 'تعديل مستخدم', username);

  res.json({ success: true });
});

app.delete('/api/users/:id', requireAuth, (req, res) => {
  if (!req.session.user.permissions.manageUsers) {
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  }

  const id = parseInt(req.params.id);
  let users = readJSON('users.json') || [];

  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  if (user.username === 'Admin') {
    return res.status(400).json({ error: 'لا يمكن حذف حساب المدير الرئيسي' });
  }

  users = users.filter(u => u.id !== id);
  writeJSON('users.json', users);
  addLog(req.session.user.username, 'حذف مستخدم', user.username);

  res.json({ success: true });
});

// ==================== API: القيود ====================
app.get('/api/restrictions', requireAuth, (req, res) => {
  const restrictions = readJSON('restrictions.json') || [];
  res.json(restrictions);
});

app.post('/api/restrictions', requireAuth, (req, res) => {
  if (!req.session.user.permissions.manageRestrictions) {
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  }

  const { truckNumber, driverName, restrictedFactories, reason, active } = req.body;
  const restrictions = readJSON('restrictions.json') || [];

  const newRestriction = {
    id: Date.now(),
    truckNumber,
    driverName,
    restrictedFactories,
    reason,
    active,
    createdBy: req.session.user.username,
    createdAt: new Date().toISOString()
  };

  restrictions.push(newRestriction);
  writeJSON('restrictions.json', restrictions);
  addLog(req.session.user.username, 'إضافة قيد', `${truckNumber} - ${(restrictedFactories || []).join(', ')}`);

  res.json({ success: true, id: newRestriction.id });
});

app.put('/api/restrictions/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const restrictions = readJSON('restrictions.json') || [];

  const index = restrictions.findIndex(r => r.id === id);
  if (index === -1) return res.status(404).json({ error: 'القيد غير موجود' });

  restrictions[index] = { ...restrictions[index], ...req.body };
  writeJSON('restrictions.json', restrictions);

  res.json({ success: true });
});

app.delete('/api/restrictions/:id', requireAuth, (req, res) => {
  if (!req.session.user.permissions.manageRestrictions) {
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  }

  const id = parseInt(req.params.id);
  let restrictions = readJSON('restrictions.json') || [];

  restrictions = restrictions.filter(r => r.id !== id);
  writeJSON('restrictions.json', restrictions);
  addLog(req.session.user.username, 'حذف قيد');

  res.json({ success: true });
});

// ==================== API: التقارير ====================
app.get('/api/reports', requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;

  const start = new Date(startDate);
  const end = new Date(endDate);

  let allDistributions = [];
  let dailyData = {};
  let driverStats = {};
  let factoryStats = {};
  let materialStats = {};

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayData = readDayData(dateStr);

    if (dayData.distribution && dayData.distribution.length > 0) {
      dailyData[dateStr] = dayData.distribution.length;

      dayData.distribution.forEach(dist => {
        dist.date = dateStr;
        allDistributions.push(dist);

        const truckKey = dist.truck.number;
        if (!driverStats[truckKey]) {
          driverStats[truckKey] = {
            number: dist.truck.number,
            driver: dist.truck.driver,
            total: 0,
            road1: 0,
            road2: 0
          };
        }
        driverStats[truckKey].total++;
        if (dist.road === 1) driverStats[truckKey].road1++;
        else driverStats[truckKey].road2++;

        if (!factoryStats[dist.factory]) factoryStats[dist.factory] = { name: dist.factory, total: 0 };
        factoryStats[dist.factory].total++;

        if (!materialStats[dist.material]) materialStats[dist.material] = { name: dist.material, total: 0 };
        materialStats[dist.material].total++;
      });
    }
  }

  res.json({
    allDistributions,
    dailyData,
    driverStats,
    factoryStats,
    materialStats,
    startDate,
    endDate
  });
});

// ==================== API: السجلات ====================
app.get('/api/logs', requireAuth, (req, res) => {
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'صلاحيات المدير مطلوبة' });
  }

  const logs = readJSON('logs.json') || [];
  res.json(logs.slice(0, 100));
});

// ==================== API: النسخ الاحتياطي ====================
app.get('/api/backup', requireAuth, (req, res) => {
  const backup = {
    settings: readJSON('settings.json'),
    users: readJSON('users.json'),
    restrictions: readJSON('restrictions.json'),
    logs: readJSON('logs.json'),
    days: {},
    exportDate: new Date().toISOString()
  };

  if (fs.existsSync(DAYS_DIR)) {
    const files = fs.readdirSync(DAYS_DIR);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const date = file.replace('.json', '');
        backup.days[date] = readDayData(date);
      }
    });
  }

  addLog(req.session.user.username, 'تصدير نسخة احتياطية');
  res.json(backup);
});

app.post('/api/restore', requireAuth, (req, res) => {
  if (!req.session.user.permissions.manageBackup) {
    return res.status(403).json({ error: 'ليس لديك صلاحية' });
  }

  try {
    const data = req.body;

    let totalOrders = 0;
    let totalDist = 0;

    if (data.settings) writeJSON('settings.json', data.settings);
    if (data.restrictions) writeJSON('restrictions.json', data.restrictions);

    if (data.days) {
      Object.entries(data.days).forEach(([date, dayData]) => {
        writeDayData(date, dayData);
        totalOrders += (dayData.orders || []).length;
        totalDist += (dayData.distribution || []).length;
      });
    }

    // تنسيق قديم
    if (data.orders && typeof data.orders === 'object' && !Array.isArray(data.orders)) {
      Object.entries(data.orders).forEach(([key, value]) => {
        let orders = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(orders)) {
          const date = key.replace('orders_', '');
          const existing = readDayData(date);
          existing.orders = orders;
          writeDayData(date, existing);
          totalOrders += orders.length;
        }
      });
    }

    if (data.distribution && typeof data.distribution === 'object' && !Array.isArray(data.distribution)) {
      Object.entries(data.distribution).forEach(([key, value]) => {
        let dist = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(dist)) {
          const date = key.replace('distribution_', '');
          const existing = readDayData(date);
          existing.distribution = dist;
          writeDayData(date, existing);
          totalDist += dist.length;
        }
      });
    }

    // مفاتيح مباشرة
    Object.keys(data).forEach(key => {
      if (key.startsWith('orders_')) {
        let orders = data[key];
        if (typeof orders === 'string') orders = JSON.parse(orders);
        if (Array.isArray(orders)) {
          const date = key.replace('orders_', '');
          const existing = readDayData(date);
          existing.orders = orders;
          writeDayData(date, existing);
          totalOrders += orders.length;
        }
      }
      if (key.startsWith('distribution_')) {
        let dist = data[key];
        if (typeof dist === 'string') dist = JSON.parse(dist);
        if (Array.isArray(dist)) {
          const date = key.replace('distribution_', '');
          const existing = readDayData(date);
          existing.distribution = dist;
          writeDayData(date, existing);
          totalDist += dist.length;
        }
      }
    });

    // إعدادات مباشرة
    if (data.factories || data.materials || data.trucks) {
      const settings = readJSON('settings.json') || defaultSettings;
      if (Array.isArray(data.factories)) settings.factories = data.factories;
      if (Array.isArray(data.materials)) settings.materials = data.materials;
      if (Array.isArray(data.trucks)) settings.trucks = data.trucks;
      writeJSON('settings.json', settings);
    }

    addLog(req.session.user.username, 'استعادة نسخة احتياطية');

    res.json({ success: true, message: `تم استعادة ${totalOrders} طلب و ${totalDist} توزيع` });
  } catch (e) {
    console.error('❌ خطأ:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/clear-all', requireAuth, requireAdmin, (req, res) => {
  try {
    if (fs.existsSync(DAYS_DIR)) {
      fs.readdirSync(DAYS_DIR).forEach(file => {
        fs.unlinkSync(path.join(DAYS_DIR, file));
      });
    }

    writeJSON('settings.json', defaultSettings);
    writeJSON('restrictions.json', []);

    addLog(req.session.user.username, 'مسح جميع البيانات');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'فشل في مسح البيانات' });
  }
});

// ==================== Error Handler for CORS ====================
app.use((err, req, res, next) => {
  if (String(err.message || '').startsWith('CORS blocked')) {
    return res.status(403).json({ error: err.message });
  }
  next(err);
});

// ==================== Server Startup (مرة واحدة فقط) ====================
app.listen(PORT, () => {
  console.log('Running on port', PORT);
});