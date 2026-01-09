import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from '@kbase/database';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes placeholder
app.get('/api', (_req, res) => {
  res.json({ message: 'Knowledge Base API', version: '0.0.1' });
});

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
