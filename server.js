require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const { pool, addLog, getLogs, getLogsCount, saveReport, getReports } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// إعدادات الجلسة - معدلة لجعلها أطول وأكثر استقراراً
app.use(session({
    secret: process.env.SESSION_SECRET || 'gravel-system-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,           // إذا كنت تستخدم HTTPS غيّر إلى true
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 أيام بدلاً من 10 دقائق
        sameSite: 'lax'
    },
    name: 'gravel.sid',
    rolling: true   // يجدد الجلسة تلقائياً مع كل طلب ناجح
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    res.status(401).json({ error: 'غير مصرح' });
}
function requireAdmin(req, res, next) {
    if (req.session?.user?.role === 'admin') return next();
    res.status(403).json({ error: 'صلاحيات المدير مطلوبة' });
}

async function logAction(req, action, details, location) {
    const username = req.session?.user?.username || 'unknown';
    await addLog(username, action, details || null, location || null);
}

// ==================== إنشاء الجداول ====================
async function initTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            factory VARCHAR(255),
            permissions JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100),
            action TEXT,
            details TEXT,
            location TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS app_settings (
            id SERIAL PRIMARY KEY,
            factories JSONB DEFAULT '[]',
            materials JSONB DEFAULT '[]',
            trucks JSONB DEFAULT '[]',
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS daily_data (
            date DATE PRIMARY KEY,
            orders JSONB DEFAULT '[]',
            distribution JSONB DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS restrictions (
            id SERIAL PRIMARY KEY,
            truck_number VARCHAR(50),
            driver_name VARCHAR(100),
            restricted_factories JSONB,
            reason TEXT,
            active BOOLEAN DEFAULT true,
            created_by VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255),
            report_date DATE,
            data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS scale_reports (
            id SERIAL PRIMARY KEY,
            report_id VARCHAR(100) UNIQUE NOT NULL,
            report_name VARCHAR(500) NOT NULL,
            report_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by VARCHAR(100),
            total_rows INTEGER DEFAULT 0,
            matched_count INTEGER DEFAULT 0,
            not_matched_count INTEGER DEFAULT 0,
            total_weight_all NUMERIC DEFAULT 0,
            drivers_stats JSONB DEFAULT '[]',
            materials_stats JSONB DEFAULT '[]',
            top10_drivers JSONB DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS truck_violations (
            id SERIAL PRIMARY KEY,
            report_date DATE NOT NULL,
            truck_number VARCHAR(50) NOT NULL,
            driver_name VARCHAR(100),
            trips_count INTEGER DEFAULT 0,
            reason TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            created_by VARCHAR(100),
            UNIQUE(report_date, truck_number)
        );
    `);
    console.log('✅ Tables ensured');
}
initTables();

// ==================== دوال API (مختصرة للطول، ولكن جميع المسارات موجودة) ====================
// ... (هنا باقي دوال API كما هي في ملف server.js الأصلي، مع إضافة مسار truck-violations)

// ==================== إضافة مسارات المخالفات ====================
app.post('/api/truck-violations/save', requireAuth, async (req, res) => {
    try {
        const { date, violations } = req.body;
        if (!date || !Array.isArray(violations)) {
            return res.status(400).json({ error: 'بيانات غير صالحة' });
        }
        const username = req.session.user.username;
        for (const v of violations) {
            await pool.query(`
                INSERT INTO truck_violations (report_date, truck_number, driver_name, trips_count, reason, details, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (report_date, truck_number) 
                DO UPDATE SET 
                    driver_name = EXCLUDED.driver_name,
                    trips_count = EXCLUDED.trips_count,
                    reason = EXCLUDED.reason,
                    details = EXCLUDED.details,
                    created_by = EXCLUDED.created_by
            `, [date, v.truckNumber, v.driver, v.trips, v.reason, v.detail, username]);
        }
        await addLog(username, 'حفظ أسباب السيارات المخالفة', `التاريخ: ${date}, عدد السيارات: ${violations.length}`, null);
        res.json({ success: true, message: 'تم حفظ الأسباب بنجاح' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/truck-violations/:date', requireAuth, async (req, res) => {
    try {
        const date = req.params.date;
        const result = await pool.query(
            `SELECT truck_number, driver_name, trips_count, reason, details 
             FROM truck_violations 
             WHERE report_date = $1 
             ORDER BY truck_number`,
            [date]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/truck-violations/report/:startDate/:endDate', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const result = await pool.query(`
            SELECT * FROM truck_violations 
            WHERE report_date BETWEEN $1 AND $2 
            ORDER BY report_date DESC, truck_number
        `, [startDate, endDate]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/truck-violations/stats/:startDate/:endDate', requireAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.params;
        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT truck_number) as total_trucks,
                COUNT(*) as total_violations,
                COALESCE(AVG(trips_count), 0) as avg_trips,
                SUM(CASE WHEN trips_count = 0 THEN 1 ELSE 0 END) as zero_trips_count
            FROM truck_violations 
            WHERE report_date BETWEEN $1 AND $2
        `, [startDate, endDate]);
        
        const topTrucks = await pool.query(`
            SELECT truck_number, driver_name, COUNT(*) as violation_count, COALESCE(AVG(trips_count), 0) as avg_trips
            FROM truck_violations 
            WHERE report_date BETWEEN $1 AND $2
            GROUP BY truck_number, driver_name
            ORDER BY violation_count DESC
            LIMIT 10
        `, [startDate, endDate]);
        
        const topReasons = await pool.query(`
            SELECT reason, COUNT(*) as count
            FROM truck_violations 
            WHERE report_date BETWEEN $1 AND $2 AND reason != ''
            GROUP BY reason
            ORDER BY count DESC
            LIMIT 10
        `, [startDate, endDate]);
        
        res.json({
            general: stats.rows[0],
            topTrucks: topTrucks.rows,
            topReasons: topReasons.rows
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== باقي مسارات API (نفس السابق) ====================
// ... (ضع هنا جميع المسارات الأخرى كما هي في server.js الأصلي)

// Serve static files
const allProtectedPages = ['index.html', 'orders.html', 'distribution.html', 'trucks.html', 'products.html', 'factories.html', 'reports.html', 'settings.html', 'restrictions.html', 'users.html', 'logs.html', 'upload-report.html', 'scale_report.html', 'trucks-failed.html', 'trucks-failed-report.html'];
allProtectedPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/login.html');
        if (req.session.user.role === 'client' && page !== 'orders.html') return res.redirect('/orders.html');
        res.sendFile(path.join(__dirname, page));
    });
});
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/', (req, res) => {
    if (req.session?.user) {
        if (req.session.user.role === 'client') res.redirect('/orders.html');
        else res.redirect('/index.html');
    } else res.redirect('/login.html');
});
app.use(express.static(__dirname));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
