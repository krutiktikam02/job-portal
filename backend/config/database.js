import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';

dotenv.config();

const isDev = (process.env.NODE_ENV || '').toLowerCase() === 'development';
let ca;
if (process.env.CA_CERT_PATH) {
  ca = fs.readFileSync(process.env.CA_CERT_PATH, 'utf8');
} else if (process.env.CA_CERT) {
  ca = process.env.CA_CERT;
}

// Decide SSL behavior:
const hostIsLocal = ['127.0.0.1', 'localhost', '::1'].includes((process.env.DB_HOST || '').toLowerCase());
let sslConfig;
if (ca) {
  sslConfig = { ca };
} else if (process.env.DB_REQUIRE_SSL === 'true') {
  // Force SSL but no CA provided; we still enable validation by default.
  sslConfig = { rejectUnauthorized: true };
} else if (hostIsLocal || isDev || process.env.DB_REQUIRE_SSL === 'false') {
  // Local development: disable SSL to avoid self-signed cert errors
  sslConfig = undefined;
} else {
  // Default to validating server certs in non-local, non-dev environments
  sslConfig = { rejectUnauthorized: true };
}

const poolOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
if (sslConfig !== undefined) poolOptions.ssl = sslConfig;

const db = mysql.createPool(poolOptions);

// Immediately test if the connection works
(async () => {
  try {
    const connection = await db.getConnection();
    console.log(`✅ Connected to MySQL (${isDev ? 'Development' : 'Production'})`);
    if (poolOptions.ssl) {
      console.log('DB SSL: enabled (using CA or validation)');
    } else {
      console.log('DB SSL: disabled (local or DB_REQUIRE_SSL=false)');
    }
    connection.release();
  } catch (err) {
    console.error('❌ MySQL connection failed! Error details:', err);
    if (err && err.code === 'EPROTO') {
      console.error('Hint: TLS/SSL certificate validation failed. For local testing, set DB_REQUIRE_SSL=false or provide CA_CERT_PATH pointing to the server CA PEM.');
    }
  }
})();

export default db;