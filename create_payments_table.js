const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'Bc061192!',
  host: '127.0.0.1',
  database: 'truckgear_data',
  port: 5433
});

async function createTable() {
  try {
    await client.connect();
    
    console.log("Creating 'payments' table...");
    const createRes = await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES sales_orders(id),
        amount NUMERIC(15, 2) NOT NULL,
        payment_method TEXT NOT NULL CHECK (payment_method IN ('GCash', 'Bank Transfer')),
        reference_number TEXT NOT NULL,
        status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed')),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Table created successfully (if it didn't exist).");

    // Let's verify the table exists now
    const verifyRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'payments'");
    console.log("Verification:", JSON.stringify(verifyRes.rows, null, 2));

  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await client.end();
  }
}

createTable();
