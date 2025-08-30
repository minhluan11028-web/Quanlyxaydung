import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    taskId: z.string().uuid(),
  }),
});

const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

router.post('/', authenticateToken, validateRequest(createCommentSchema), async (req, res) => {
  try {
    const { content, taskId } = req.body;

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId: req.user!.userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      data: comment,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create comment',
    });
  }
});

router.put('/:id', authenticateToken, validateRequest(updateCommentSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Comment not found',
      });
    }

    if (comment.authorId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own comments',
      });
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      data: updatedComment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update comment',
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Comment not found',
      });
    }

    if (comment.authorId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own comments',
      });
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete comment',
    });
  }
});

export { router as commentRoutes };
