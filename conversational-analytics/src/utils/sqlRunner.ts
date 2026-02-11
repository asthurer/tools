import { MOCK_DB } from '../data/mockData';
import alasql from 'alasql';

// Initialize alasql with data
alasql.options.autocommit = true;

// Helper to reset/init the database in alasql
const initDB = () => {
    alasql('CREATE TABLE IF NOT EXISTS products');
    alasql('CREATE TABLE IF NOT EXISTS customers');
    alasql('CREATE TABLE IF NOT EXISTS sales');

    // Clear existing data to avoid duplicates on re-runs (if we were persisting)
    // For this in-memory mock, we can just reload
    alasql('DELETE FROM products');
    alasql('DELETE FROM customers');
    alasql('DELETE FROM sales');

    alasql.tables.products.data = [...MOCK_DB.products];
    alasql.tables.customers.data = [...MOCK_DB.customers];
    alasql.tables.sales.data = [...MOCK_DB.sales];
};

export interface QueryResult {
    success: boolean;
    data?: any[];
    error?: string;
    executedSQL?: string;
}

import { type DatabaseConfig } from '../types/settings';

export const executeSQL = async (sql: string, config?: DatabaseConfig): Promise<QueryResult> => {
    // Mock Data (Local)
    if (!config || config.type === 'mock') {
        try {
            initDB();
            const trimmedSQL = sql.trim().replace(/;/g, '');
            const upperSQL = trimmedSQL.toUpperCase();
            const allowedCommands = ['SELECT', 'SHOW', 'DESCRIBE'];

            if (!allowedCommands.some(cmd => upperSQL.startsWith(cmd))) {
                return {
                    success: false,
                    error: "Only SELECT, SHOW, and DESCRIBE queries are allowed in this demo.",
                    executedSQL: sql
                };
            }

            const data = alasql(trimmedSQL) as any[];
            return {
                success: true,
                data: data,
                executedSQL: trimmedSQL
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "An unknown error occurred",
                executedSQL: sql
            };
        }
    }

    // Remote Database (Supabase Edge Function)
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
        const functionUrl = `${supabaseUrl}/functions/v1/query-proxy`;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY}`
            },
            body: JSON.stringify({ type: config.type, config, sql })
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Non-JSON response:", text);
            return {
                success: false,
                error: `Server returned non-JSON response: ${text.substring(0, 100)}... (Status: ${response.status})`,
                executedSQL: sql
            };
        }

        if (!result.success) {
            return {
                success: false,
                error: result.message || "Database Error",
                executedSQL: sql
            };
        }

        return {
            success: true,
            data: result.data,
            executedSQL: sql
        };

    } catch (error: any) {
        return {
            success: false,
            error: `Failed to connect to Supabase Function: ${error.message}.`,
            executedSQL: sql
        };
    }
};
