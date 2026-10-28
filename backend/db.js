import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "thato_library",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function testDatabase() {
  const connection = await pool.getConnection();
  try { await connection.query("SELECT 1"); }
  finally { connection.release(); }
}