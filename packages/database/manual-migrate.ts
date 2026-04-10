import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.env.DATABASE_URL ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

async function manualMigrate() {
  const sql = postgres(url, { max: 1 });
  
  try {
    console.log('Running migrations manually...\n');
    
    const migrations = [
      '0000_nifty_riptide.sql',
      '0001_goofy_talos.sql',
      '0002_silly_tyger_tiger.sql',
      '0003_open_spot.sql',
    ];
    
    for (const migration of migrations) {
      console.log(`Applying ${migration}...`);
      const migrationSQL = readFileSync(join(__dirname, 'drizzle', migration), 'utf-8');
      
      // Split by statement breakpoint and execute each statement
      const statements = migrationSQL
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
        } catch (error: any) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            console.error(`  Error in statement: ${error.message}`);
            throw error;
          }
        }
      }
      
      console.log(`  ✓ ${migration} applied`);
    }
    
    console.log('\n✅ All migrations applied successfully!');
    
    // Check tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log(`\nCreated ${tables.length} tables:`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

manualMigrate();
