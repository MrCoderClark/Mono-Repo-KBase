import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@kbase/database';
import { validate } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: RouterType = Router();

const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Content is required').max(5000),
    contentType: z.enum(['ARTICLE', 'DOCUMENT']),
    contentId: z.string().min(1, 'Content ID is required'),
    parentId: z.string().optional(),
  }),
});

const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Content is required').max(5000),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const listCommentsSchema = z.object({
  query: z.object({
    contentType: z.enum(['ARTICLE', 'DOCUMENT']),
    contentId: z.string(),
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(20).optional(),
  }),
});

// GET /api/comments - List comments for content
router.get('/', validate(listCommentsSchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { contentType, contentId } = req.query as {
      contentType: 'ARTICLE' | 'DOCUMENT';
      contentId: string;
    };

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      contentType,
      parentId: null, // Only top-level comments
    };

    if (contentType === 'ARTICLE') {
      where.articleId = contentId;
    } else {
      where.documentId = contentId;
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    res.json({
      success: true,
      data: { comments },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/comments - Create comment
router.post('/', requireAuth, validate(createCommentSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { content, contentType, contentId, parentId } = req.body;

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

    // Verify parent comment exists if provided
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PARENT_COMMENT_NOT_FOUND',
            message: 'Parent comment not found',
          },
        });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        contentType,
        articleId: contentType === 'ARTICLE' ? contentId : null,
        documentId: contentType === 'DOCUMENT' ? contentId : null,
        authorId: req.user!.userId,
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/comments/:id - Update comment
router.put('/:id', requireAuth, validate(updateCommentSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      res.status(404).json({
        success: false,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Comment not found',
        },
      });
      return;
    }

    // Only author can edit their comment
    if (comment.authorId !== req.user!.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own comments',
        },
      });
      return;
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { comment: updatedComment },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/comments/:id - Delete comment
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) {
      res.status(404).json({
        success: false,
        error: {
          code: 'COMMENT_NOT_FOUND',
          message: 'Comment not found',
        },
      });
      return;
    }

    // Author or admin can delete
    const isOwner = comment.authorId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to delete this comment',
        },
      });
      return;
    }

    await prisma.comment.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Comment deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
