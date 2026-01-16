import mysql from 'mysql2/promise'; // Using promise-based for better error handling
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // THIS FIXES YOUR SSL ERROR locally 👇
  ssl: {
    rejectUnauthorized: false 
  }
});

// Test connection immediately
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL Database Connected Successfully!');
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

export default db;