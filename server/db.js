const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mainline.proxy.rlwy.net',
  port: process.env.DB_PORT || 56861,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ktyftkysSQppWBOFwDPgRrKCsFutMkrM',
  database: process.env.DB_NAME || 'railway',
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función de prueba mejorada
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query('SHOW TABLES');
    console.log('Tablas disponibles:', rows);
    return true;
  } catch (err) {
    console.error('Error de conexión:', {
      message: err.message,
      code: err.code,
      config: {
        host: pool.config.connectionConfig.host,
        port: pool.config.connectionConfig.port,
        database: pool.config.connectionConfig.database
      }
    });
    return false;
  } finally {
    if (conn) conn.release();
  }
}

// Probamos la conexión al iniciar
testConnection();

module.exports = {
  pool,
  getConnection: () => pool.getConnection(),
  query: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
};
