import 'dotenv/config';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

const pool = mysql.createPool({
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

// 2. Function to run SQL queries
export async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

export default pool;