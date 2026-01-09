import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { z } from 'zod';
import multer, { FileFilterCallback } from 'multer';
import { prisma } from '@kbase/database';
import { slugify } from '@kbase/utils';
import { validate } from '../middleware/validate';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  uploadFile,
  deleteFile,
  getSignedDownloadUrl,
  generateFileKey,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '../lib/storage';

const router: RouterType = Router();

// Extend AuthRequest to include file from multer
interface AuthRequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word, Excel, Text, Markdown'));
    }
  },
});

const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    categoryId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const listDocumentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(10).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    categoryId: z.string().optional(),
    authorId: z.string().optional(),
    search: z.string().optional(),
  }),
});

// GET /api/documents - List documents
router.get('/', validate(listDocumentsSchema), async (req, res, next) => {
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

    // Only show published documents to non-authenticated users
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
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          status: true,
          downloadsCount: true,
          createdAt: true,
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
      prisma.document.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        documents: documents.map((d) => ({
          ...d,
          tags: d.tags.map((t) => t.tag),
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

// GET /api/documents/:id - Get single document
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
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

    // Check if non-authenticated user can view non-published document
    const authReq = req as AuthRequest;
    if (document.status !== 'PUBLISHED' && !authReq.user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        document: {
          ...document,
          tags: document.tags.map((t) => t.tag),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/download - Get download URL
router.get('/:id/download', async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

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

    // Check if non-authenticated user can download non-published document
    const authReq = req as AuthRequest;
    if (document.status !== 'PUBLISHED' && !authReq.user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });
      return;
    }

    // Extract key from fileUrl
    const urlParts = document.fileUrl.split('/');
    const key = urlParts.slice(-3).join('/'); // documents/userId/filename

    const downloadUrl = await getSignedDownloadUrl(key);

    // Increment download count
    await prisma.document.update({
      where: { id },
      data: { downloadsCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.fileName,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/documents/upload - Upload document
router.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequestWithFile, res: Response, next) => {
  try {
    // Check if user has permission to upload documents
    if (req.user!.role === 'VIEWER') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to upload documents',
        },
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded',
        },
      });
      return;
    }

    const { title, description, categoryId, tags, status } = req.body;
    const file = req.file;

    // Generate file key and upload to S3
    const fileKey = generateFileKey(req.user!.userId, file.originalname);
    const fileUrl = await uploadFile(fileKey, file.buffer, file.mimetype);

    // Create document record
    const document = await prisma.document.create({
      data: {
        title: title || file.originalname,
        description,
        fileName: file.originalname,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        authorId: req.user!.userId,
        categoryId,
        status: status || 'DRAFT',
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
    if (tags) {
      const tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;
      for (const tagName of tagList) {
        const tagSlug = slugify(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });

        await prisma.documentTag.create({
          data: {
            documentId: document.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch document with tags
    const documentWithTags = await prisma.document.findUnique({
      where: { id: document.id },
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
        document: {
          ...documentWithTags,
          tags: documentWithTags?.tags.map((t) => t.tag) || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/documents/:id - Update document metadata
router.put('/:id', requireAuth, validate(updateDocumentSchema), async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId, tags, status } = req.body;

    const document = await prisma.document.findUnique({
      where: { id },
    });

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

    // Check permissions
    const isOwner = document.authorId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to edit this document',
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
          message: 'You do not have permission to edit documents',
        },
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (status !== undefined) updateData.status = status;

    await prisma.document.update({
      where: { id },
      data: updateData,
    });

    // Handle tags update
    if (tags !== undefined) {
      // Remove existing tags
      await prisma.documentTag.deleteMany({
        where: { documentId: id },
      });

      // Add new tags
      for (const tagName of tags) {
        const tagSlug = slugify(tagName);
        const tag = await prisma.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
        });

        await prisma.documentTag.create({
          data: {
            documentId: id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch updated document with tags
    const updatedDocument = await prisma.document.findUnique({
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
        document: {
          ...updatedDocument,
          tags: updatedDocument?.tags.map((t) => t.tag) || [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
    });

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

    // Only admins can delete documents
    if (req.user!.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only admins can delete documents',
        },
      });
      return;
    }

    // Delete file from S3
    const urlParts = document.fileUrl.split('/');
    const key = urlParts.slice(-3).join('/');
    await deleteFile(key);

    // Delete document record
    await prisma.document.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
