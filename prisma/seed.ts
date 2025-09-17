import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.analysis.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const user1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      emailVerified: new Date(),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      emailVerified: new Date(),
    },
  });

  // Create projects for user1
  const project1 = await prisma.project.create({
    data: {
      userId: user1.id,
      title: 'The Last Sunset',
      description: 'A drama about redemption and second chances',
      content: `FADE IN:

EXT. DESERT HIGHWAY - SUNSET

A lone car speeds down an empty highway as the sun sets behind distant mountains.

INT. CAR - CONTINUOUS

JACK (40s), weathered face, grips the steering wheel. His eyes dart to the rearview mirror.

JACK
(to himself)
Just a few more miles...

The radio crackles with static. Jack turns it off. Silence fills the car.

FADE OUT.`,
      status: 'active',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      userId: user1.id,
      title: 'City of Shadows',
      description: 'A noir thriller set in 1940s Los Angeles',
      content: `FADE IN:

INT. DETECTIVE'S OFFICE - NIGHT

Rain beats against the window. DETECTIVE MILES (35) sits at his desk, cigarette smoke curling around him.

A KNOCK at the door.

MILES
Come in.

The door opens. A WOMAN IN RED enters, her face hidden by shadows.

WOMAN
Detective Miles? I need your help.

MILES
(stubbing out cigarette)
Lady, at this hour, everyone needs help.

FADE OUT.`,
      status: 'draft',
    },
  });

  // Create project for user2
  const project3 = await prisma.project.create({
    data: {
      userId: user2.id,
      title: 'Space Station Alpha',
      description: 'A sci-fi adventure on the edge of the galaxy',
      content: `FADE IN:

INT. SPACE STATION - COMMAND CENTER - DAY

Alarms blare. Red lights flash. CAPTAIN NOVA (30s) rushes to the main console.

CAPTAIN NOVA
Status report!

LIEUTENANT CHEN
Hull breach in sector 7. We're losing oxygen.

CAPTAIN NOVA
Seal it off. Everyone to emergency stations.

The crew scrambles. Through the viewport, Earth is a distant blue marble.

FADE OUT.`,
      status: 'active',
    },
  });

  // Create analyses
  const analysis1 = await prisma.analysis.create({
    data: {
      projectId: project1.id,
      status: 'completed',
      result: {
        score: 85,
        issues: ['Minor pacing issues in Act 2', 'Character motivation unclear'],
        strengths: ['Strong opening', 'Compelling protagonist'],
      },
      suggestions: {
        improvements: [
          'Add more backstory for Jack',
          'Clarify the stakes in the opening scene',
        ],
      },
      startedAt: new Date(Date.now() - 3600000),
      completedAt: new Date(Date.now() - 3000000),
    },
  });

  const analysis2 = await prisma.analysis.create({
    data: {
      projectId: project2.id,
      status: 'processing',
      startedAt: new Date(),
    },
  });

  const analysis3 = await prisma.analysis.create({
    data: {
      projectId: project3.id,
      status: 'completed',
      result: {
        score: 92,
        issues: ['Technical jargon may confuse audience'],
        strengths: ['Excellent world-building', 'High stakes established early'],
      },
      suggestions: {
        improvements: [
          'Simplify technical dialogue',
          'Add more visual descriptions',
        ],
      },
      startedAt: new Date(Date.now() - 7200000),
      completedAt: new Date(Date.now() - 6000000),
    },
  });

  const analysis4 = await prisma.analysis.create({
    data: {
      projectId: project1.id,
      status: 'failed',
      errors: {
        message: 'Script format parsing error',
        code: 'PARSE_ERROR',
      },
      startedAt: new Date(Date.now() - 86400000),
      completedAt: new Date(Date.now() - 86000000),
    },
  });

  console.log('Seed completed successfully!');
  console.log(`Created ${2} users`);
  console.log(`Created ${3} projects`);
  console.log(`Created ${4} analyses`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });