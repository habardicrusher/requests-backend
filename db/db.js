const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) console.error('❌ Supabase connection failed:', err.message);
    else console.log('✅ Connected to Supabase PostgreSQL');
});

// ========== Logs ==========
async function addLog(username, action, details, location) {
    await pool.query(
        `INSERT INTO logs (username, action, details, location, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [username, action, details, location]
    );
}

async function getLogs(limit, offset) {
    const res = await pool.query(
        `SELECT * FROM logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return res.rows;
}

async function getLogsCount() {
    const res = await pool.query(`SELECT COUNT(*) FROM logs`);
    return parseInt(res.rows[0].count);
}

// ========== Reports (uploaded files) ==========
async function saveReport(reportData) {
    const { filename, report_date, data } = reportData;
    const res = await pool.query(
        `INSERT INTO reports (filename, report_date, data, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [filename, report_date, JSON.stringify(data)]
    );
    return { id: res.rows[0].id };
}

async function getReports(filters = {}) {
    let query = `SELECT * FROM reports ORDER BY created_at DESC`;
    const params = [];
    if (filters.filename) {
        query = `SELECT * FROM reports WHERE filename ILIKE $1 ORDER BY created_at DESC`;
        params.push(`%${filters.filename}%`);
    }
    const res = await pool.query(query, params);
    return res.rows;
}

module.exports = { pool, addLog, getLogs, getLogsCount, saveReport, getReports };
