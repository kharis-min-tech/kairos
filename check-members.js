// Quick script to check members in database
const { getDb } = require('@kairos/utils');
const { members } = require('@kairos/database');

async function checkMembers() {
  const db = getDb();
  const allMembers = await db.select().from(members).limit(5);
  console.log('Members in database:');
  console.log(JSON.stringify(allMembers, null, 2));
}

checkMembers().catch(console.error);
