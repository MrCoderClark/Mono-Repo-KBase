import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@kbase/database';
import { validate } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: RouterType = Router();

const createReactionSchema = z.object({
  body: z.object({
    type: z.enum(['LIKE', 'DISLIKE']),
    contentType: z.enum(['ARTICLE', 'DOCUMENT']),
    contentId: z.string().min(1, 'Content ID is required'),
  }),
});

const getReactionsSchema = z.object({
  query: z.object({
    contentType: z.enum(['ARTICLE', 'DOCUMENT']),
    contentId: z.string(),
  }),
});

// GET /api/reactions - Get reaction counts for content
router.get('/', validate(getReactionsSchema), async (req, res, next) => {
  try {
    const { contentType, contentId } = req.query as {
      contentType: 'ARTICLE' | 'DOCUMENT';
      contentId: string;
    };

    const where: Record<string, unknown> = { contentType };

    if (contentType === 'ARTICLE') {
      where.articleId = contentId;
    } else {
      where.documentId = contentId;
    }

    const [likes, dislikes] = await Promise.all([
      prisma.reaction.count({
        where: { ...where, type: 'LIKE' },
      }),
      prisma.reaction.count({
        where: { ...where, type: 'DISLIKE' },
      }),
    ]);

    // Check if current user has reacted
    const authReq = req as AuthRequest;
    let userReaction = null;

    if (authReq.user) {
      const reaction = await prisma.reaction.findFirst({
        where: {
          ...where,
          userId: authReq.user.userId,
        },
      });
      userReaction = reaction?.type || null;
    }

    res.json({
      success: true,
      data: {
        likes,
        dislikes,
        userReaction,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/reactions - Add or toggle reaction
router.post('/', requireAuth, validate(createReactionSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { type, contentType, contentId } = req.body;

    // Verify content exists
    if (contentType === 'ARTICLE') {
      const article = await prisma.article.findUnique({ where: { id: contentId } });
      if (!article) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ARTICLE_NOT_FOUND',
            message: 'Article not found',
          },
        });
        return;
      }
    } else {
      const document = await prisma.document.findUnique({ where: { id: contentId } });
      if (!document) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
          },
        });
        return;
      }
    }

    const where: Record<string, unknown> = {
      userId: req.user!.userId,
      contentType,
    };

    if (contentType === 'ARTICLE') {
      where.articleId = contentId;
    } else {
      where.documentId = contentId;
    }

    // Check for existing reaction
    const existingReaction = await prisma.reaction.findFirst({ where });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // Same reaction type - remove it (toggle off)
        await prisma.reaction.delete({ where: { id: existingReaction.id } });

        res.json({
          success: true,
          data: {
            action: 'removed',
            message: `${type.toLowerCase()} removed`,
          },
        });
        return;
      } else {
        // Different reaction type - update it
        const updatedReaction = await prisma.reaction.update({
          where: { id: existingReaction.id },
          data: { type },
        });

        res.json({
          success: true,
          data: {
            action: 'updated',
            reaction: updatedReaction,
          },
        });
        return;
      }
    }

    // Create new reaction
    const reaction = await prisma.reaction.create({
      data: {
        type,
        contentType,
        userId: req.user!.userId,
        articleId: contentType === 'ARTICLE' ? contentId : null,
        documentId: contentType === 'DOCUMENT' ? contentId : null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        action: 'created',
        reaction,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reactions - Remove reaction
router.delete('/', requireAuth, validate(getReactionsSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { contentType, contentId } = req.query as {
      contentType: 'ARTICLE' | 'DOCUMENT';
      contentId: string;
    };

    const where: Record<string, unknown> = {
      userId: req.user!.userId,
      contentType,
    };

    if (contentType === 'ARTICLE') {
      where.articleId = contentId;
    } else {
      where.documentId = contentId;
    }

    const reaction = await prisma.reaction.findFirst({ where });

    if (!reaction) {
      res.status(404).json({
        success: false,
        error: {
          code: 'REACTION_NOT_FOUND',
          message: 'Reaction not found',
        },
      });
      return;
    }

    await prisma.reaction.delete({ where: { id: reaction.id } });

    res.json({
      success: true,
      data: { message: 'Reaction removed successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
