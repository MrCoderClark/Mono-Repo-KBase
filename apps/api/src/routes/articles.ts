import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@kbase/database';
import { slugify } from '@kbase/utils';
import { validate } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: RouterType = Router();

const createArticleSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    excerpt: z.string().max(500).optional(),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  }),
});

const updateArticleSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    excerpt: z.string().max(500).optional(),
    categoryId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const listArticlesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(10).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    categoryId: z.string().optional(),
    authorId: z.string().optional(),
    search: z.string().optional(),
  }),
});

// Helper to generate unique slug
async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  let slug = slugify(title);
  let counter = 0;
  let uniqueSlug = slug;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug: uniqueSlug },
    });

    if (!existing || existing.id === excludeId) {
      return uniqueSlug;
    }

    counter++;
    uniqueSlug = `${slug}-${counter}`;
  }
}

// GET /api/articles - List articles
router.get('/', validate(listArticlesSchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const { status, categoryId, authorId, search } = req.query as {
      status?: string;
      categoryId?: string;
      authorId?: string;
      search?: string;
    };

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    // Only show published articles to non-authenticated users
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      where.status = 'PUBLISHED';
    } else if (status) {
      where.status = status;
    }

    if (categoryId) where.categoryId = categoryId;
    if (authorId) where.authorId = authorId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          status: true,
          viewsCount: true,
          createdAt: true,
          publishedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
            },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        articles: articles.map((a) => ({
          ...a,
          tags: a.tags.map((t) => t.tag),
        })),
      },
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

// GET /api/articles/:idOrSlug - Get single article
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

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

    // Check if non-authenticated user can view non-published article
    const authReq = req as AuthRequest;
    if (article.status !== 'PUBLISHED' && !authReq.user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article not found',
        },
      });
      return;
    }

    // Increment view count
    await prisma.article.update({
      where: { id: article.id },
      data: { viewsCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        article: {
          ...article,
          tags: article.tags.map((t) => t.tag),
          viewsCount: article.viewsCount + 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/articles - Create article
router.post('/', requireAuth, validate(createArticleSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    // Check if user has permission to create articles
    if (req.user!.role === 'VIEWER') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to create articles',
        },
      });
      return;
    }

    const { title, content, excerpt, categoryId, tags, status } = req.body;

    const slug = await generateUniqueSlug(title);

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        authorId: req.user!.userId,
        categoryId,
        status: status || 'DRAFT',
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });

        await prisma.articleTag.create({
          data: {
            articleId: article.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch article with tags
    const articleWithTags = await prisma.article.findUnique({
      where: { id: article.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        category: true,
        tags: {
          select: {
            tag: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        article: {
          ...articleWithTags,
          tags: articleWithTags?.tags.map((t) => t.tag) || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/articles/:id - Update article
router.put('/:id', requireAuth, validate(updateArticleSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, categoryId, tags, status } = req.body;

    const article = await prisma.article.findUnique({
      where: { id },
    });

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

    // Check permissions
    const isOwner = article.authorId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this article',
        },
      });
      return;
    }

    // Viewers cannot edit
    if (req.user!.role === 'VIEWER') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit articles',
        },
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (title) {
      updateData.title = title;
      updateData.slug = await generateUniqueSlug(title, id);
    }
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (status) {
      updateData.status = status;
      if (status === 'PUBLISHED' && !article.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        category: true,
      },
    });

    // Handle tags update
    if (tags !== undefined) {
      // Remove existing tags
      await prisma.articleTag.deleteMany({
        where: { articleId: id },
      });

      // Add new tags
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });

        await prisma.articleTag.create({
          data: {
            articleId: id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch article with tags
    const articleWithTags = await prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        category: true,
        tags: {
          select: {
            tag: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        article: {
          ...articleWithTags,
          tags: articleWithTags?.tags.map((t) => t.tag) || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/articles/:id - Delete article
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id },
    });

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

    // Only admins can delete articles
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can delete articles',
        },
      });
      return;
    }

    await prisma.article.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Article deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
