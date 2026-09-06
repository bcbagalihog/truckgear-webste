import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function syncCatalog() {
  console.log('🔄 Syncing PostgreSQL truck_parts to client/public/products.json...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Bc061192!@127.0.0.1:5433/truckgear_data',
    connectionTimeoutMillis: 3000
  });

  try {
    const res = await pool.query('SELECT id, sku, name, category, location, cost_price, selling_price, stock_quantity, stock_quantity_bonifacio, stock_quantity_batangas, image_url, images FROM public.truck_parts ORDER BY id DESC');
    
    const mapped = res.rows.map(r => {
      let imgs = [];
      try {
        imgs = typeof r.images === 'string' ? JSON.parse(r.images) : (Array.isArray(r.images) ? r.images : []);
      } catch(_) {}
      if (!Array.isArray(imgs)) imgs = [];
      if (r.image_url && !imgs.includes(r.image_url)) imgs.unshift(r.image_url);

      return {
        id: r.id,
        sku: r.sku,
        name: r.name,
        category: r.category || 'General',
        location: r.location || 'Universal',
        fitment: r.location || 'Universal',
        costPrice: parseFloat(r.cost_price) || 0,
        sellingPrice: parseFloat(r.selling_price) || 0,
        stockQuantity: parseInt(r.stock_quantity) || 10,
        stockQuantityBonifacio: parseInt(r.stock_quantity_bonifacio) || 10,
        stockQuantityBatangas: parseInt(r.stock_quantity_batangas) || 0,
        stock: parseInt(r.stock_quantity) || 10,
        imageUrl: imgs[0] || r.image_url || '',
        images: imgs
      };
    });

    const targetPath = path.join(process.cwd(), 'client/public/products.json');
    fs.writeFileSync(targetPath, JSON.stringify(mapped, null, 2));
    console.log(`✅ Successfully synced ${mapped.length} products to client/public/products.json!`);
  } catch (err) {
    console.error('❌ Failed to sync catalog from PostgreSQL:', err.message);
  } finally {
    await pool.end();
  }
}

syncCatalog();
