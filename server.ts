import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config.js';
import { authRouter } from './server/routes/auth.js';
import { documentsRouter } from './server/routes/documents.js';
import { settingsRouter } from './server/routes/settings.js';
import { remindersRouter } from './server/routes/reminders.js';
import { logsRouter } from './server/routes/logs.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { reminderScheduler } from './server/services/scheduler.js';

async function bootstrap() {
  const app = express();

  // Basic security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Body parsers
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/reminders', remindersRouter);
  app.use('/api/logs', logsRouter);

  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Document Tracker Vendor',
    });
  });

  // Mount Vite dev server in development or serve built static files in production
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Central Error Handler
  app.use(errorHandler);

  // Inisialisasi scheduler background
  reminderScheduler.start();

  // Jalankan server
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 Document Tracker Vendor Server berjalan di http://0.0.0.0:${config.port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Menutup server dengan aman...');
    reminderScheduler.stop();
    server.close(() => {
      console.log('Server tertutup.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
