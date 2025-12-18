const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }                
});

//Test connection
pool.connect()
    .then(() => console.log("Connected to PostgreSQL Database:" + process.env.DB_NAME))
    .catch(err => console.error("PostgreSQL connection error:", err.stack));
// Export the pool to use it in server.js
module.exports = pool;
