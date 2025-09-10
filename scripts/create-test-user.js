const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User',
      },
    });
    
    console.log('Test user created successfully:', {
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('User with email test@example.com already exists');
    } else {
      console.error('Error creating test user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();