#!/usr/bin/env npx tsx

/**
 * Script to seed demo user for testing
 */

import { prisma } from '../lib/db/client';

async function seedDemoUser() {
  try {
    console.log('Creating demo user...');

    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'demo-user' }
    });

    if (existingUser) {
      console.log('Demo user already exists');
      return existingUser;
    }

    // Create demo user
    const user = await prisma.user.create({
      data: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        password: null, // No password for demo user
      }
    });

    console.log('✅ Demo user created:', user.id);
    return user;
  } catch (error) {
    console.error('❌ Failed to create demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedDemoUser()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });