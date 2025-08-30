import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    let taskWhere: any = {};
    let projectWhere: any = {};

    // Role-based filtering
    if (userRole === 'MEMBER') {
      taskWhere.assigneeId = userId;
    } else if (userRole === 'MANAGER') {
      const userProjects = await prisma.project.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      taskWhere.OR = [
        { projectId: { in: userProjects.map(p => p.id) } },
        { assigneeId: userId },
      ];
      projectWhere.ownerId = userId;
    }
    // Admins can see all data

    const [
      totalTasks,
      completedTasks,
      overdueTasks,
      totalProjects,
      recentTasks,
    ] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ 
        where: { 
          ...taskWhere, 
          status: 'DONE' 
        } 
      }),
      prisma.task.count({ 
        where: { 
          ...taskWhere, 
          dueDate: { 
            lt: new Date() 
          },
          status: { not: 'DONE' }
        } 
      }),
      prisma.project.count({ where: projectWhere }),
      prisma.task.findMany({
        where: taskWhere,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    // Get weekly completed tasks for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyCompletedTasks = await prisma.task.findMany({
      where: {
        ...taskWhere,
        status: 'DONE',
        updatedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        updatedAt: true,
      },
    });

    // Group by date
    const weeklyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = weeklyCompletedTasks.filter(task => 
        task.updatedAt.toISOString().split('T')[0] === dateStr
      ).length;
      return { date: dateStr, count };
    }).reverse();

    res.json({
      data: {
        totalTasks,
        completedTasks,
        overdueTasks,
        totalProjects,
        recentTasks,
        weeklyCompletedTasks: weeklyStats,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch dashboard stats',
    });
  }
});

export { router as dashboardRoutes };
