import { createDb } from './index';
import { branches } from './schema/branches';
import { eq } from 'drizzle-orm';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const db = createDb(databaseUrl);

async function updateSchedules() {
  // Kharis London Central - Thursday midweek
  await db.update(branches)
    .set({
      serviceSchedule: [
        { day: 'Sunday', time: '14:00', type: 'Sunday Service' },
        { day: 'Thursday', time: '19:00', type: 'Midweek Service' },
      ],
    })
    .where(eq(branches.branchName, 'Kharis London Central'));

  // Kharis Manchester - Wednesday midweek
  await db.update(branches)
    .set({
      serviceSchedule: [
        { day: 'Sunday', time: '14:00', type: 'Sunday Service' },
        { day: 'Wednesday', time: '19:00', type: 'Midweek Service' },
      ],
    })
    .where(eq(branches.branchName, 'Kharis Manchester'));

  // Kharis Accra - Wednesday midweek
  await db.update(branches)
    .set({
      serviceSchedule: [
        { day: 'Sunday', time: '14:00', type: 'Sunday Service' },
        { day: 'Wednesday', time: '19:00', type: 'Midweek Service' },
      ],
    })
    .where(eq(branches.branchName, 'Kharis Accra'));

  // Kharis Kumasi - Wednesday midweek
  await db.update(branches)
    .set({
      serviceSchedule: [
        { day: 'Sunday', time: '14:00', type: 'Sunday Service' },
        { day: 'Wednesday', time: '19:00', type: 'Midweek Service' },
      ],
    })
    .where(eq(branches.branchName, 'Kharis Kumasi'));

  // Kharis Freetown - Wednesday midweek at 6PM
  await db.update(branches)
    .set({
      serviceSchedule: [
        { day: 'Sunday', time: '14:00', type: 'Sunday Service' },
        { day: 'Wednesday', time: '18:00', type: 'Midweek Service' },
      ],
    })
    .where(eq(branches.branchName, 'Kharis Freetown'));

  console.log('✓ Service schedules updated for all branches');
  process.exit(0);
}

updateSchedules().catch((err) => {
  console.error('Failed to update schedules:', err);
  process.exit(1);
});
