const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'Bc061192!',
  host: '34.15.161.70',
  database: 'postgres', // connect to the default postgres db first
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

async function findDbs() {
  try {
    await client.connect();
    console.log("Listing all databases:");
    const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error connecting to DB:", err);
  } finally {
    await client.end();
  }
}

findDbs();
