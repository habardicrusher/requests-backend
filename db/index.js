const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_HGwqC4TJaXD6@ep-dawn-king-a11873v3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// قائمة السيارات الكاملة (74 سيارة)
const defaultTrucks = [
    { number: '1091', driver: 'سينج' }, { number: '2757', driver: 'انيس' }, { number: '2758', driver: 'عارف' },
    { number: '2759', driver: 'عتيق الاسلام' }, { number: '2760', driver: 'سليمان' }, { number: '2762', driver: 'زرداد' },
    { number: '2818', driver: 'شهداب' }, { number: '2927', driver: 'مدثر' }, { number: '2928', driver: 'سمر اقبال' },
    { number: '2929', driver: 'عرفان شبير' }, { number: '3321', driver: 'وقاص' }, { number: '3322', driver: 'نعيم' },
    { number: '3324', driver: 'محمد كليم' }, { number: '3325', driver: 'احسان' }, { number: '3326', driver: 'نويد' },
    { number: '3461', driver: 'جيفان كومار' }, { number: '3462', driver: 'افتخار' }, { number: '3963', driver: 'شكيل' },
    { number: '4445', driver: 'عرفان' }, { number: '5324', driver: 'بابر' }, { number: '5367', driver: 'سلفر تان' },
    { number: '5520', driver: 'نابين' }, { number: '5521', driver: 'فضل' }, { number: '5522', driver: 'عبيدالله' },
    { number: '5523', driver: 'محمد فيصل' }, { number: '5524', driver: 'بير محمد' }, { number: '5525', driver: 'صدير الاسلام' },
    { number: '5526', driver: 'محمد عبدو' }, { number: '5527', driver: 'سكير' }, { number: '5528', driver: 'تشاندان' },
    { number: '5658', driver: 'مسعود خان' }, { number: '5796', driver: 'ساهيل طارق' }, { number: '5797', driver: 'عبد القادر' },
    { number: '5800', driver: 'غوا محمد' }, { number: '6398', driver: 'نديم خان' }, { number: '6428', driver: 'برديب' },
    { number: '6429', driver: 'طاهر' }, { number: '6430', driver: 'سليمان غولزار' }, { number: '6432', driver: 'برويز اختر' },
    { number: '6612', driver: 'ذو القرنين' }, { number: '6613', driver: 'نظيم خان' }, { number: '6614', driver: 'فينود' },
    { number: '6615', driver: 'رسول' }, { number: '6616', driver: 'يعقوب' }, { number: '6617', driver: 'اظهر' },
    { number: '6618', driver: 'عثمان' }, { number: '6619', driver: 'مينا خان' }, { number: '6620', driver: 'محمد ساحل' },
    { number: '6621', driver: 'اسد' }, { number: '6622', driver: 'مانوج' }, { number: '6623', driver: 'خالد رحمان' },
    { number: '6624', driver: 'هداية' }, { number: '6626', driver: 'HARENDRA' }, { number: '6629', driver: 'جاويد' },
    { number: '6935', driver: 'تيمور' }, { number: '6939', driver: 'ارشد' }, { number: '7042', driver: 'فيراس' },
    { number: '7043', driver: 'ايوب خان' }, { number: '7332', driver: 'علي رضا' }, { number: '7682', driver: 'خالد' },
    { number: '7750', driver: 'نديم' }, { number: '7837', driver: 'ارسلان' }, { number: '7926', driver: 'سجاد' },
    { number: '7927', driver: 'اكبر' }, { number: '7928', driver: 'امير' }, { number: '7929', driver: 'طاهر محمود' },
    { number: '7930', driver: 'ناريندر' }, { number: '7974', driver: 'شريف' }, { number: '7980', driver: 'شعيب' },
    { number: '9103', driver: 'ساكب' }, { number: '9492', driver: 'عدنان' }, { number: '9493', driver: 'عامر' },
    { number: '9495', driver: 'ميزان' }, { number: '9496', driver: 'غفور احمد' }
];

pool.connect((err, client, release) => {
    if (err) return console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.stack);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    release();
});

async function initSettingsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                factories JSONB NOT NULL DEFAULT '[]',
                materials JSONB NOT NULL DEFAULT '[]',
                trucks JSONB NOT NULL DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        const res = await pool.query('SELECT * FROM app_settings WHERE id = 1');
        if (res.rows.length === 0) {
            const defaultFactories = [
                { name: 'SCCCL', location: 'الدمام' },
                { name: 'الحارث للمنتجات الاسمنيه', location: 'الدمام' },
                { name: 'الحارثي القديم', location: 'الدمام' },
                { name: 'المعجل لمنتجات الاسمنت', location: 'الدمام' },
                { name: 'الحارث العزيزية', location: 'الدمام' },
                { name: 'سارمكس النظيم', location: 'الرياض' },
                { name: 'عبر الخليج', location: 'الرياض' },
                { name: 'الكفاح للخرسانة الجاهزة', location: 'الدمام' },
                { name: 'القيشان 3', location: 'الدمام' },
                { name: 'القيشان 2 - الأحجار الشرقية', location: 'الدمام' },
                { name: 'القيشان 1', location: 'الدمام' },
                { name: 'الفهد للبلوك والخرسانة', location: 'الرياض' }
            ];
            const defaultMaterials = ['3/4', '3/8', '3/16'];
            await pool.query(
                'INSERT INTO app_settings (id, factories, materials, trucks) VALUES (1, $1, $2, $3)',
                [JSON.stringify(defaultFactories), JSON.stringify(defaultMaterials), JSON.stringify(defaultTrucks)]
            );
            console.log('✅ تم إنشاء جدول الإعدادات مع السيارات الـ 74');
        } else {
            // تحديث قائمة السيارات إلى القائمة الكاملة (استبدال)
            await pool.query(
                'UPDATE app_settings SET trucks = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
                [JSON.stringify(defaultTrucks)]
            );
            console.log('✅ تم تحديث السيارات إلى القائمة الكاملة (74 سيارة)');
        }
    } catch (err) {
        console.error('❌ خطأ في إنشاء جدول الإعدادات:', err);
    }
}
initSettingsTable();

module.exports = { pool };
