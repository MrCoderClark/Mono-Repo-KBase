import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from '@kbase/database';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './routes/auth';
import articleRoutes from './routes/articles';
import commentRoutes from './routes/comments';
import reactionRoutes from './routes/reactions';
import documentRoutes from './routes/documents';
import categoryRoutes from './routes/categories';
import tagRoutes from './routes/tags';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'Knowledge Base API', version: '0.0.1' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Article routes
app.use('/api/articles', articleRoutes);

// Comment routes
app.use('/api/comments', commentRoutes);

// Reaction routes
app.use('/api/reactions', reactionRoutes);

// Document routes
app.use('/api/documents', documentRoutes);

// Category routes
app.use('/api/categories', categoryRoutes);

// Tag routes
app.use('/api/tags', tagRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
