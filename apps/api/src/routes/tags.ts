import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { prisma } from '@kbase/database';

const router: RouterType = Router();

// GET /api/tags - List all tags
router.get('/', async (_req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            articles: true,
            documents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: { tags },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tags/:slug - Get single tag with content
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const tag = await prisma.tag.findUnique({
      where: { slug },
      include: {
        articles: {
          where: {
            article: {
              status: 'PUBLISHED',
            },
          },
          select: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          take: 10,
        },
        documents: {
          where: {
            document: {
              status: 'PUBLISHED',
            },
          },
          select: {
            document: {
              select: {
                id: true,
                title: true,
                description: true,
                createdAt: true,
                author: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          take: 10,
        },
        _count: {
          select: {
            articles: true,
            documents: true,
          },
        },
      },
    });

    if (!tag) {
      res.status(404).json({
        success: false,
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        tag: {
          ...tag,
          articles: tag.articles.map((a) => a.article),
          documents: tag.documents.map((d) => d.document),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
