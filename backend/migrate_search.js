const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'Bc061192!',
  host: '127.0.0.1',
  database: 'truckgear_data',
  port: 5433
});

async function migrate() {
  try {
    await client.connect();
    
    // 1. Add column
    await client.query('ALTER TABLE IF EXISTS public.truck_parts ADD COLUMN IF NOT EXISTS search_vector tsvector');
    
    // 2. Initial populate
    await client.query("UPDATE public.truck_parts SET search_vector = to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(part_number, '') || ' ' || COALESCE(description, ''))");
    
    // 3. Create index
    await client.query('CREATE INDEX IF NOT EXISTS truck_parts_search_idx ON public.truck_parts USING GIN(search_vector)');
    
    // 4. Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION public.truck_parts_search_trigger() RETURNS trigger AS $$
      BEGIN
        new.search_vector := to_tsvector('english', COALESCE(new.name, '') || ' ' || COALESCE(new.part_number, '') || ' ' || COALESCE(new.description, ''));
        return new;
      END
      $$ LANGUAGE plpgsql;
    `);

    // 5. Create trigger
    await client.query('DROP TRIGGER IF EXISTS tsvectorupdate ON public.truck_parts');
    await client.query('CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON public.truck_parts FOR EACH ROW EXECUTE FUNCTION public.truck_parts_search_trigger()');

    console.log("SQL Migration: Successfully implemented tsvector search and triggers.");

  } catch (err) {
    console.error("Migration Failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
