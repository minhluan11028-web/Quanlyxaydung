import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

const createLabelSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    color: z.string().regex(/^#[0-9A-F]{6}$/i),
    projectId: z.string().uuid(),
  }),
});

const updateLabelSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const labels = await prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });

    res.json({
      data: labels,
    });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch labels',
    });
  }
});

router.post('/', authenticateToken, requireRole(['ADMIN', 'MANAGER']), validateRequest(createLabelSchema), async (req, res) => {
  try {
    const { name, color, projectId } = req.body;

    // Check if user can create labels in this project
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
        message: 'You can only create labels in your own projects',
      });
    }

    const label = await prisma.label.create({
      data: {
        name,
        color,
        projectId,
      },
    });

    res.status(201).json({
      data: label,
    });
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create label',
    });
  }
});

router.put('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER']), validateRequest(updateLabelSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const label = await prisma.label.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!label) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Label not found',
      });
    }

    if (req.user!.role === 'MANAGER' && label.project.ownerId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update labels in your own projects',
      });
    }

    const updatedLabel = await prisma.label.update({
      where: { id },
      data: {
        name,
        color,
      },
    });

    res.json({
      data: updatedLabel,
    });
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update label',
    });
  }
});

router.delete('/:id', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;

    const label = await prisma.label.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!label) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Label not found',
      });
    }

    if (req.user!.role === 'MANAGER' && label.project.ownerId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete labels from your own projects',
      });
    }

    await prisma.label.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete label',
    });
  }
});

export { router as labelRoutes };
