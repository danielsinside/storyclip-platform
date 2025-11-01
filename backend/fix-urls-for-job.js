/**
 * Script para actualizar URLs relativas a absolutas en la base de datos
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database/storyclip.db');
const CDN_BASE = process.env.CDN_BASE || 'https://story.creatorsflow.app/outputs';

const jobId = process.argv[2];

if (!jobId) {
  console.error('❌ Usage: node fix-urls-for-job.js <jobId>');
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH);

// Obtener el job actual
db.get('SELECT job_id, output_urls FROM jobs WHERE job_id = ?', [jobId], (err, row) => {
  if (err) {
    console.error('❌ Error querying database:', err.message);
    db.close();
    process.exit(1);
  }

  if (!row) {
    console.error(`❌ Job not found: ${jobId}`);
    db.close();
    process.exit(1);
  }

  console.log(`📋 Found job: ${row.job_id}`);
  console.log(`📄 Current output_urls: ${row.output_urls}`);

  // Parse URLs
  let urls;
  try {
    urls = JSON.parse(row.output_urls);
  } catch (e) {
    console.error('❌ Error parsing output_urls:', e.message);
    db.close();
    process.exit(1);
  }

  // Convertir URLs relativas a absolutas
  const updatedUrls = urls.map(url => {
    if (url.startsWith('/outputs/')) {
      // Convertir URL relativa a absoluta
      return url.replace('/outputs/', `${CDN_BASE}/`);
    }
    return url; // Ya es absoluta
  });

  console.log(`\n🔄 Converting ${urls.length} URLs:`);
  console.log(`   FROM: ${urls[0]}`);
  console.log(`   TO:   ${updatedUrls[0]}`);

  // Actualizar en la base de datos
  db.run(
    'UPDATE jobs SET output_urls = ? WHERE job_id = ?',
    [JSON.stringify(updatedUrls), jobId],
    function(err) {
      if (err) {
        console.error('❌ Error updating database:', err.message);
        db.close();
        process.exit(1);
      }

      console.log(`\n✅ Successfully updated ${this.changes} job(s)`);
      console.log(`📊 New URLs: ${JSON.stringify(updatedUrls, null, 2)}`);

      db.close();
      console.log('\n🎉 Done! The frontend should now load thumbnails correctly.');
    }
  );
});
