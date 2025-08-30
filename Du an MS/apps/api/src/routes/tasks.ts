import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: z.string().datetime().optional(),
    assigneeId: z.string().uuid().optional(),
    projectId: z.string().uuid(),
    labelIds: z.array(z.string().uuid()).optional(),
  }),
});

const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: z.string().datetime().optional(),
    assigneeId: z.string().uuid().optional(),
    labelIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const taskQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assigneeId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    labelIds: z.array(z.string().uuid()).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

router.get('/', authenticateToken, validateRequest(taskQuerySchema), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, assigneeId, projectId, labelIds, search, sortBy = 'createdAt', sortOrder = 'desc', startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (projectId) where.projectId = projectId;
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate as string);
      if (endDate) where.dueDate.lte = new Date(endDate as string);
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (labelIds && labelIds.length > 0) {
      where.labels = {
        some: {
          labelId: { in: labelIds as string[] },
        },
      };
    }

    // Role-based filtering
    if (req.user!.role === 'MEMBER') {
      where.assigneeId = req.user!.userId;
    } else if (req.user!.role === 'MANAGER') {
      // Managers can see tasks from their projects or tasks assigned to them
      const userProjects = await prisma.project.findMany({
        where: { ownerId: req.user!.userId },
        select: { id: true },
      });
      where.OR = [
        { projectId: { in: userProjects.map(p => p.id) } },
        { assigneeId: req.user!.userId },
      ];
    }
    // Admins can see all tasks

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
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
          labels: {
            include: {
              label: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      data: tasks,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch tasks',
    });
  }
});

router.post('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), validateRequest(createTaskSchema), async (req, res) => {
  try {
    const { title, description, status = 'BACKLOG', priority = 'MEDIUM', dueDate, assigneeId, projectId, labelIds } = req.body;

    // Check if user can create tasks in this project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    if (req.user!.role === 'MANAGER' && project.ownerId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create tasks in your own projects',
      });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId,
        projectId,
        labels: labelIds ? {
          create: labelIds.map((labelId: string) => ({
            labelId,
          })),
        } : undefined,
      },
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
        labels: {
          include: {
            label: true,
          },
        },
      },
    });

    res.status(201).json({
      data: task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create task',
    });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
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
            ownerId: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    // Check permissions
    if (req.user!.role === 'MEMBER' && task.assigneeId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this task',
      });
    } else if (req.user!.role === 'MANAGER' && task.project.ownerId !== req.user!.userId && task.assigneeId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this task',
      });
    }

    res.json({
      data: task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch task',
    });
  }
});

router.put('/:id', authenticateToken, validateRequest(updateTaskSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assigneeId, labelIds } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    // Check permissions
    if (req.user!.role === 'MEMBER' && task.assigneeId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update tasks assigned to you',
      });
    } else if (req.user!.role === 'MANAGER' && task.project.ownerId !== req.user!.userId && task.assigneeId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this task',
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId,
        labels: labelIds ? {
          deleteMany: {},
          create: labelIds.map((labelId: string) => ({
            labelId,
          })),
        } : undefined,
      },
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
        labels: {
          include: {
            label: true,
          },
        },
      },
    });

    res.json({
      data: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update task',
    });
  }
});

router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found',
      });
    }

    // Check if user can delete this task
    if (req.user!.role === 'MANAGER' && task.project.ownerId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete tasks from your own projects',
      });
    }

    await prisma.task.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete task',
    });
  }
});

export { router as taskRoutes };
