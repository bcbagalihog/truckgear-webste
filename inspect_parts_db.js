const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'Bc061192!',
  host: '127.0.0.1',
  database: 'truckgear_data',
  port: 5433
});

async function inspect() {
  try {
    await client.connect();
    
    // 1. List all tables
    console.log("Listing all tables in truckgear_data:");
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(JSON.stringify(tablesRes.rows, null, 2));

    // 2. Describe relevant tables for "Parts Monitoring"
    for (const table of tablesRes.rows) {
        if (table.table_name.includes('part') || table.table_name.includes('inventory') || table.table_name.includes('order') || table.table_name.includes('receipt')) {
            console.log(`\nDescribing table: ${table.table_name}`);
            const describeRes = await client.query(`
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = '${table.table_name}'
            `);
            console.log(JSON.stringify(describeRes.rows, null, 2));
        }
    }

  } catch (err) {
    console.error("Error connecting to DB:", err);
  } finally {
    await client.end();
  }
}

inspect();
