import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import * as mysql from "npm:mysql2/promise";
import sql from "npm:mssql";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { type, config, sql: querySql } = await req.json();

        // --- Test Connection Logic ---
        if (req.url.endsWith("/connect") || req.url.endsWith("/connect/")) {
            // Fetch Public IP for Whitelisting
            let outboundIp = 'unknown';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                outboundIp = ipData.ip;
            } catch (e) {
                console.error("Failed to fetch IP:", e);
            }

            try {
                const useSsl = config.ssl !== false; // Default to true if undefined

                if (type === 'postgres') {
                    const client = new Client({
                        user: config.username,
                        database: config.database,
                        hostname: config.host,
                        port: config.port,
                        password: config.password,
                        tls: { enabled: useSsl }
                    });
                    await client.connect();
                    await client.end();
                    return new Response(JSON.stringify({
                        success: true,
                        message: 'Connected to PostgreSQL successfully',
                        ip: outboundIp
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                if (type === 'mysql') {
                    const conn = await mysql.createConnection({
                        host: config.host,
                        user: config.username,
                        password: config.password,
                        database: config.database,
                        port: config.port,
                        ssl: useSsl ? { rejectUnauthorized: false } : undefined
                    });
                    await conn.end();
                    return new Response(JSON.stringify({
                        success: true,
                        message: 'Connected to MySQL successfully',
                        ip: outboundIp
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                if (type === 'sqlserver') {
                    const sqlConfig = {
                        user: config.username,
                        password: config.password,
                        database: config.database,
                        server: config.host,
                        port: config.port,
                        options: {
                            encrypt: useSsl,
                            trustServerCertificate: true
                        }
                    };
                    const pool = await sql.connect(sqlConfig);
                    await pool.close();
                    return new Response(JSON.stringify({
                        success: true,
                        message: 'Connected to SQL Server successfully',
                        ip: outboundIp
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Unsupported database type',
                    ip: outboundIp
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 400
                });

            } catch (dbError: any) {
                return new Response(JSON.stringify({
                    success: false,
                    error: dbError.message || dbError.toString(),
                    message: `Connection Failed: ${dbError.message}`,
                    ip: outboundIp
                }), {
                    status: 200, // Return 200 so frontend can parse JSON and show IP
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        // --- Query Logic ---
        // Handle SQL Execution
        if (!querySql) {
            return new Response(JSON.stringify({ success: false, message: 'Missing SQL query' }), { status: 400, headers: corsHeaders });
        }

        // Basic Validation
        const upperSql = querySql.trim().toUpperCase();
        if (!upperSql.startsWith('SELECT') && !upperSql.startsWith('SHOW') && !upperSql.startsWith('DESCRIBE')) {
            return new Response(JSON.stringify({ success: false, message: 'Only SELECT, SHOW, and DESCRIBE queries are allowed.' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            });
        }

        let rows = [];
        const useSsl = config.ssl !== false;

        if (type === 'postgres') {
            const client = new Client({
                user: config.username,
                database: config.database,
                hostname: config.host,
                port: config.port,
                password: config.password,
                tls: { enabled: useSsl }
            });
            await client.connect();
            const result = await client.queryObject(querySql);
            rows = result.rows;
            await client.end();
        } else if (type === 'mysql') {
            const conn = await mysql.createConnection({
                host: config.host,
                user: config.username,
                password: config.password,
                database: config.database,
                port: config.port,
                ssl: useSsl ? { rejectUnauthorized: false } : undefined
            });
            const [results] = await conn.execute(querySql);
            rows = results;
            await conn.end();
        } else if (type === 'sqlserver') {
            const sqlConfig = {
                user: config.username,
                password: config.password,
                database: config.database,
                server: config.host,
                port: config.port,
                options: {
                    encrypt: useSsl,
                    trustServerCertificate: true
                }
            };
            const pool = await sql.connect(sqlConfig);
            const result = await pool.request().query(querySql);
            rows = result.recordset;
            await pool.close();
        } else {
            return new Response(JSON.stringify({ success: false, message: 'Unsupported database type' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400
            });
        }

        return new Response(JSON.stringify({ success: true, data: rows }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
