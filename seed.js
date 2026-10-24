import { seedDatabase } from './seeder.js';

seedDatabase()
  .then(() => {
    console.log('[Seeder] Database successfully populated with authentic ChhotaBhai mobile accessories.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seeder] Seed failed:', err);
    process.exit(1);
  });
