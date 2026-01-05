import { db } from '../server/db';
import { sports } from '../shared/schema';

/**
 * This script adds more sports to reach 30 total sports
 * Run with: npx tsx scripts/add-more-sports.ts
 */
async function main() {
  console.log('Adding more sports to reach 30...');

  const existingSports = await db.select().from(sports);
  console.log(`Currently have ${existingSports.length} sports`);

  const newSports = [
    { 
      name: 'Badminton', 
      slug: 'badminton',
      icon: '🏸',
      wurlusSportId: 'badminton_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_1'
    },
    { 
      name: 'Golf', 
      slug: 'golf',
      icon: '⛳',
      wurlusSportId: 'golf_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_1'
    },
    { 
      name: 'Snooker', 
      slug: 'snooker',
      icon: '🎱',
      wurlusSportId: 'snooker_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_1'
    },
    { 
      name: 'Darts', 
      slug: 'darts',
      icon: '🎯',
      wurlusSportId: 'darts_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_1'
    },
    { 
      name: 'Handball', 
      slug: 'handball',
      icon: '🤾',
      wurlusSportId: 'handball_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_1'
    },
    { 
      name: 'Beach Volleyball', 
      slug: 'beach-volleyball',
      icon: '🏐',
      wurlusSportId: 'beach_volleyball_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_1'
    },
    { 
      name: 'Formula 1', 
      slug: 'formula-1',
      icon: '🏎️',
      wurlusSportId: 'formula1_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_2'
    },
    { 
      name: 'Cycling', 
      slug: 'cycling',
      icon: '🚴',
      wurlusSportId: 'cycling_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_2'
    },
    { 
      name: 'Swimming', 
      slug: 'swimming',
      icon: '🏊',
      wurlusSportId: 'swimming_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_2'
    },
    { 
      name: 'Athletics', 
      slug: 'athletics',
      icon: '🏃',
      wurlusSportId: 'athletics_wurlus_id',
      isActive: true,
      providerId: 'sports_provider_2'
    }
  ];

  // Insert new sports data
  if (existingSports.length < 30) {
    const result = await db.insert(sports).values(newSports);
    console.log(`Added ${newSports.length} new sports`);
    
    const updatedCount = await db.select().from(sports);
    console.log(`Now have ${updatedCount.length} total sports`);
  } else {
    console.log('Already have 30 or more sports, skipping addition');
  }
}

main()
  .catch(e => {
    console.error('Error adding more sports:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });