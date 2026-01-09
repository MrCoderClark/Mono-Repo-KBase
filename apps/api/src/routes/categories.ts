import { Router, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@kbase/database';
import { slugify } from '@kbase/utils';
import { validate } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router: RouterType = Router();

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    parentId: z.string().optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    parentId: z.string().nullable().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

// GET /api/categories - List all categories
router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/categories/:idOrSlug - Get single category
router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const category = await prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            articles: true,
            documents: true,
          },
        },
      },
    });

    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories - Create category (Admin only)
router.post('/', requireAuth, validate(createCategorySchema), async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can create categories',
        },
      });
      return;
    }

    const { name, description, parentId } = req.body;
    const slug = slugify(name);

    // Check if slug already exists
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CATEGORY_EXISTS',
          message: 'A category with this name already exists',
        },
      });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        parentId,
      },
      include: {
        parent: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { category },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/categories/:id - Update category (Admin only)
router.put('/:id', requireAuth, validate(updateCategorySchema), async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can update categories',
        },
      });
      return;
    }

    const { id } = req.params;
    const { name, description, parentId } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
        },
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (name) {
      updateData.name = name;
      updateData.slug = slugify(name);
    }
    if (description !== undefined) updateData.description = description;
    if (parentId !== undefined) updateData.parentId = parentId;

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });

    res.json({
      success: true,
      data: { category: updatedCategory },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id - Delete category (Admin only)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can delete categories',
        },
      });
      return;
    }

    const { id } = req.params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
        },
      });
      return;
    }

    await prisma.category.delete({ where: { id } });

    res.json({
      success: true,
      data: { message: 'Category deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
