import 'dotenv/config';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync('ca.pem'),
    rejectUnauthorized: true
  }
});

// Run a parameterised SQL query
export async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Get a raw connection for transactions
export async function getConnection() {
  return await pool.getConnection();
}

/**
 * Executes a callback within a MySQL transaction.
 * Auto-commits on success, auto-rollbacks on error, always releases connection.
 */
export async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
