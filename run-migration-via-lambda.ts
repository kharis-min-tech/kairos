// Temporary script to run fellowship_type migration via Lambda
import { initDb } from './packages/utils/src/db-client/client';
import { sql } from 'drizzle-orm';

export const handler = async () => {
  try {
    const db = await initDb();
    
    console.log('Running migration: Add fellowship_type column...');
    
    // Add the column
    await db.execute(sql`
      ALTER TABLE fellowships 
      ADD COLUMN IF NOT EXISTS fellowship_type VARCHAR(100) NOT NULL DEFAULT 'K-Groups'
    `);
    
    console.log('Column added successfully');
    
    // Drop existing constraint if it exists
    await db.execute(sql`
      ALTER TABLE fellowships
      DROP CONSTRAINT IF EXISTS chk_fellowships_type
    `);
    
    console.log('Old constraint dropped');
    
    // Add the check constraint
    await db.execute(sql`
      ALTER TABLE fellowships
      ADD CONSTRAINT chk_fellowships_type 
      CHECK (fellowship_type IN ('K-Groups', 'Kharis Express', 'New Breeds', 'Kharis on Campus', 'Kharis on Campus Colleges'))
    `);
    
    console.log('Check constraint added successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Migration completed successfully!' })
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
