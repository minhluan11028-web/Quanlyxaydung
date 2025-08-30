import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.taskLabel.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleared existing data');

  // Create users
  const adminPassword = await hashPassword('password123');
  const managerPassword = await hashPassword('password123');
  const memberPassword = await hashPassword('password123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      password: managerPassword,
      name: 'Manager User',
      role: UserRole.MANAGER,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'member@example.com',
      password: memberPassword,
      name: 'Member User',
      role: UserRole.MEMBER,
    },
  });

  console.log('👥 Created users');

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete redesign of company website',
      ownerId: manager.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Develop new mobile application',
      ownerId: admin.id,
    },
  });

  console.log('📁 Created projects');

  // Create labels
  const labels = await Promise.all([
    prisma.label.create({
      data: {
        name: 'Frontend',
        color: '#3B82F6',
        projectId: project1.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Backend',
        color: '#10B981',
        projectId: project1.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Design',
        color: '#F59E0B',
        projectId: project1.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Bug',
        color: '#EF4444',
        projectId: project2.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Feature',
        color: '#8B5CF6',
        projectId: project2.id,
      },
    }),
  ]);

  console.log('🏷️  Created labels');

  // Create tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Design Homepage Layout',
        description: 'Create wireframes and mockups for the new homepage',
        status: 'DONE',
        priority: 'HIGH',
        dueDate: new Date('2024-02-15'),
        assigneeId: member.id,
        projectId: project1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement User Authentication',
        description: 'Set up JWT authentication system',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueDate: new Date('2024-02-20'),
        assigneeId: manager.id,
        projectId: project1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Create API Documentation',
        description: 'Write comprehensive API documentation',
        status: 'BACKLOG',
        priority: 'MEDIUM',
        dueDate: new Date('2024-02-25'),
        assigneeId: member.id,
        projectId: project1.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Fix Login Bug',
        description: 'Users cannot login with special characters in password',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueDate: new Date('2024-02-18'),
        assigneeId: admin.id,
        projectId: project2.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Add Push Notifications',
        description: 'Implement push notification system',
        status: 'BACKLOG',
        priority: 'HIGH',
        dueDate: new Date('2024-03-01'),
        assigneeId: manager.id,
        projectId: project2.id,
      },
    }),
  ]);

  console.log('📋 Created tasks');

  // Assign labels to tasks
  await Promise.all([
    prisma.taskLabel.create({
      data: {
        taskId: tasks[0].id,
        labelId: labels[2].id, // Design
      },
    }),
    prisma.taskLabel.create({
      data: {
        taskId: tasks[1].id,
        labelId: labels[1].id, // Backend
      },
    }),
    prisma.taskLabel.create({
      data: {
        taskId: tasks[2].id,
        labelId: labels[1].id, // Backend
      },
    }),
    prisma.taskLabel.create({
      data: {
        taskId: tasks[3].id,
        labelId: labels[3].id, // Bug
      },
    }),
    prisma.taskLabel.create({
      data: {
        taskId: tasks[4].id,
        labelId: labels[4].id, // Feature
      },
    }),
  ]);

  console.log('🏷️  Assigned labels to tasks');

  // Create comments
  await Promise.all([
    prisma.comment.create({
      data: {
        content: 'Design looks great! Ready for development.',
        taskId: tasks[0].id,
        authorId: manager.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Working on JWT implementation. Should be done by Friday.',
        taskId: tasks[1].id,
        authorId: manager.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Bug confirmed. Investigating the issue.',
        taskId: tasks[3].id,
        authorId: admin.id,
      },
    }),
  ]);

  console.log('💬 Created comments');

  console.log('✅ Database seeded successfully!');
  console.log('\n📧 Default credentials:');
  console.log('Admin: admin@example.com / password123');
  console.log('Manager: manager@example.com / password123');
  console.log('Member: member@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
