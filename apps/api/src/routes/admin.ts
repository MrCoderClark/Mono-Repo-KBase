import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@kbase/database';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router: RouterType = Router();

const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
  }),
});

// Get all users (admin only)
router.get('/users', requireAuth, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch users' },
    });
  }
});

// Update user role (admin only)
router.put(
  '/users/:userId/role',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateRoleSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Prevent admin from changing their own role
      if (userId === req.user?.userId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_OPERATION', message: 'Cannot change your own role' },
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      res.json({
        success: true,
        data: { user: updatedUser },
      });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update role' },
      });
    }
  }
);

// Get admin stats (admin only)
router.get('/stats', requireAuth, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const [usersCount, articlesCount, documentsCount] = await Promise.all([
      prisma.user.count(),
      prisma.article.count(),
      prisma.document.count(),
    ]);

    res.json({
      success: true,
      data: {
        users: usersCount,
        articles: articlesCount,
        documents: documentsCount,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' },
    });
  }
});

export default router;
