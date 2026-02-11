const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// --- Database Connection Helpers ---

// Postgres
const connectPg = async (config) => {
    const pool = new Pool({
        user: config.username,
        host: config.host,
        database: config.database,
        password: config.password,
        port: config.port,
        ssl: config.ssl ? { rejectUnauthorized: false } : false // simplified SSL
    });
    // Test connection
    const client = await pool.connect();
    client.release();
    return pool;
};

// MySQL
const connectMysql = async (config) => {
    const connection = await mysql.createConnection({
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database,
        port: config.port,
        ssl: config.ssl ? { rejectsUnauthorized: false } : undefined
    });
    return connection;
};

// SQL Server
const connectMssql = async (config) => {
    const sqlConfig = {
        user: config.username,
        password: config.password,
        database: config.database,
        server: config.host,
        port: config.port,
        options: {
            encrypt: true, // for azure
            trustServerCertificate: true // change to true for local dev / self-signed certs
        }
    };
    const pool = await sql.connect(sqlConfig);
    return pool;
};

// --- Routes ---

app.get('/', (req, res) => {
    res.send('Conversational Analytics Backend is Running');
});

// Test Connection
app.post('/api/connect', async (req, res) => {
    const { type, config } = req.body;

    try {
        if (type === 'postgres') {
            const pool = await connectPg(config);
            await pool.end();
            return res.json({ success: true, message: 'Connected to PostgreSQL successfully' });
        }
        if (type === 'mysql') {
            const conn = await connectMysql(config);
            await conn.end();
            return res.json({ success: true, message: 'Connected to MySQL successfully' });
        }
        if (type === 'sqlserver') {
            const pool = await connectMssql(config);
            await pool.close();
            return res.json({ success: true, message: 'Connected to SQL Server successfully' });
        }

        return res.status(400).json({ success: false, message: 'Unsupported database type' });
    } catch (error) {
        console.error('Connection Error:', error);
        return res.status(500).json({ success: false, message: error.message, error: error.toString() });
    }
});

// Execute Query
app.post('/api/query', async (req, res) => {
    const { type, config, sql: querySql } = req.body;

    // Basic safety check (very minimal, primarily relies on read-only DB user permissions in real usage)
    const upperSql = querySql.trim().toUpperCase();
    if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('SHOW') && !upperSql.startsWith('DESCRIBE')) {
        return res.status(400).json({ success: false, message: 'Only SELECT, SHOW, and DESCRIBE queries are allowed.' });
    }

    try {
        let rows = [];

        if (type === 'postgres') {
            const pool = await connectPg(config);
            const result = await pool.query(querySql);
            rows = result.rows;
            await pool.end();
        } else if (type === 'mysql') {
            const conn = await connectMysql(config);
            const [results] = await conn.execute(querySql);
            rows = results;
            await conn.end();
        } else if (type === 'sqlserver') {
            const pool = await connectMssql(config);
            const result = await pool.request().query(querySql);
            rows = result.recordset;
            await pool.close();
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported database type' });
        }

        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Query Error:', error);
        return res.status(500).json({ success: false, message: error.message, error: error.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
