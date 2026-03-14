const postgres = require('postgres');

const sql = postgres({
  host: 'kairos-staging-aurora-cluster.cluster-chg6wk8qanwm.eu-west-2.rds.amazonaws.com',
  port: 5432,
  database: 'kairos',
  username: 'kairos_admin',
  password: '^t_^A7D.mqqJU-nQ6VRrKtNE52xnpZ',
  ssl: 'require',
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    
    // Add fellowship_type column
    await sql.unsafe(`
      ALTER TABLE fellowships 
      ADD COLUMN IF NOT EXISTS fellowship_type VARCHAR(100) NOT NULL DEFAULT 'K-Groups';
    `);
    console.log('✅ Added fellowship_type column');
    
    // Add check constraint
    await sql.unsafe(`
      ALTER TABLE fellowships
      DROP CONSTRAINT IF EXISTS chk_fellowships_type;
    `);
    console.log('✅ Dropped old constraint (if exists)');
    
    await sql.unsafe(`
      ALTER TABLE fellowships
      ADD CONSTRAINT chk_fellowships_type 
      CHECK (fellowship_type IN ('K-Groups', 'Kharis Express', 'New Breeds', 'Kharis on Campus', 'Kharis on Campus Colleges'));
    `);
    console.log('✅ Added check constraint');
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Refresh your browser at http://localhost:3000/fellowships');
    console.log('2. Try creating a fellowship - it should work now!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);
