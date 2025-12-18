const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,         
  host: process.env.DB_HOST,         
  database: process.env.DB_NAME,   
  password: process.env.DB_PASSWORD, 
  port: 5432,                
});

//Test connection
pool.connect()
    .then(() => console.log("Connected to PostgreSQL Database:" + process.env.DB_NAME))
    .catch(err => console.error("PostgreSQL connection error:", err.stack));
// Export the pool to use it in server.js
module.exports = pool;
