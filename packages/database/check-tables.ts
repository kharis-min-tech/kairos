import postgres from 'postgres';

const url = process.env.DATABASE_URL ?? 'postgresql://kairos:kairos@localhost:5432/kairos';

async function checkTables() {
  const sql = postgres(url, { max: 1 });
  
  try {
    console.log('Checking database tables...\n');
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`  - ${t.table_name}`));
    
    console.log('\nChecking drizzle migrations...');
    const migrations = await sql`
      SELECT * FROM drizzle.__drizzle_migrations 
      ORDER BY created_at
    `;
    
    console.log(`\nApplied ${migrations.length} migrations:`);
    migrations.forEach(m => console.log(`  - ${m.hash} (${new Date(m.created_at).toISOString()})`));
    
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkTables();
