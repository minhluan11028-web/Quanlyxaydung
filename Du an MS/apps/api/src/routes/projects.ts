import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
});

const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

const projectQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    ownerId: z.string().uuid().optional(),
  }),
});

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', authenticateToken, validateRequest(projectQuerySchema), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, ownerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    // Role-based filtering
    if (req.user!.role === 'MEMBER') {
      // Members can only see projects where they are assigned tasks
      const userTaskProjects = await prisma.task.findMany({
        where: { assigneeId: req.user!.userId },
        select: { projectId: true },
        distinct: ['projectId'],
      });
      where.id = { in: userTaskProjects.map(t => t.projectId) };
    } else if (req.user!.role === 'MANAGER') {
      // Managers can see their own projects and projects they're assigned to
      const userTaskProjects = await prisma.task.findMany({
        where: { assigneeId: req.user!.userId },
        select: { projectId: true },
        distinct: ['projectId'],
      });
      where.OR = [
        { ownerId: req.user!.userId },
        { id: { in: userTaskProjects.map(t => t.projectId) } },
      ];
    }
    // Admins can see all projects

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      data: projects,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch projects',
    });
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 */
router.post('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), validateRequest(createProjectSchema), async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        ownerId: req.user!.userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      data: project,
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create project',
    });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Project details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            labels: {
              include: {
                label: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        labels: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Check permissions
    if (req.user!.role === 'MEMBER') {
      const hasAccess = project.tasks.some(task => task.assigneeId === req.user!.userId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this project',
        });
      }
    } else if (req.user!.role === 'MANAGER' && project.ownerId !== req.user!.userId) {
      const hasAccess = project.tasks.some(task => task.assigneeId === req.user!.userId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this project',
        });
      }
    }

    res.json({
      data: project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch project',
    });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 */
router.put('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER']), validateRequest(updateProjectSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Check if user can update this project
    if (req.user!.role === 'MANAGER' && project.ownerId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own projects',
      });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      data: updatedProject,
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update project',
    });
  }
});

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Project deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 */
router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found',
      });
    }

    // Check if user can delete this project
    if (req.user!.role === 'MANAGER' && project.ownerId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own projects',
      });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete project',
    });
  }
});

export { router as projectRoutes };
