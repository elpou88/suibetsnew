import { db } from '../server/db';
import { sports } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script removes specified sports from the database
 * Run with: npx tsx scripts/remove-sports.ts
 */
async function main() {
  console.log('Removing specified sports from the database...');

  const sportsToRemove = ['alpine-skiing', 'chess', 'surfing', 'olympics'];
  
  console.log(`Starting removal of sports: ${sportsToRemove.join(', ')}`);
  
  // Delete each sport
  for (const sportSlug of sportsToRemove) {
    try {
      const result = await db.delete(sports).where(eq(sports.slug, sportSlug));
      console.log(`Removed sport: ${sportSlug}`);
    } catch (error) {
      console.error(`Error removing sport ${sportSlug}:`, error);
    }
  }
  
  // Verify current sports count
  const remainingSports = await db.select().from(sports);
  console.log(`Now have ${remainingSports.length} total sports remaining in the database`);
  
  console.log('Sports removal completed');
}

main()
  .catch(e => {
    console.error('Error removing sports:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });