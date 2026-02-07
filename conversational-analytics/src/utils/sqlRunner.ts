import { MOCK_DB, type Database } from '../data/mockData';
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

export const executeSQL = (sql: string, config?: DatabaseConfig): QueryResult => {
    // TODO: Implement real database connection usage when config.type != 'mock'
    if (config?.type !== 'mock') {
        return {
            success: false,
            error: "Real database connections are not yet implemented. Please rely on mock data for now.",
            executedSQL: sql
        };
    }
    try {
        initDB(); // Ensure DB is fresh

        // Basic sanitization/validation
        const trimmedSQL = sql.trim().replace(/;/g, '');
        const upperSQL = trimmedSQL.toUpperCase();

        const allowedCommands = ['SELECT', 'SHOW', 'DESCRIBE'];
        const isAllowed = allowedCommands.some(cmd => upperSQL.startsWith(cmd));

        if (!isAllowed) {
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
};
