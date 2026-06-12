import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env['SENTRY_DSN_BACKEND'] ?? '',
  environment: process.env['NODE_ENV'] ?? 'development',
  tracesSampleRate: 0.2,
  enabled: !!(process.env['SENTRY_DSN_BACKEND']),
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import config from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';

// ── Stage 2 routes ───────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes';

// ── Stage 3 routes ───────────────────────────────────────────────────────────
import subjectRoutes from './routes/subjects.routes';
import scheduleRoutes from './routes/schedule.routes';
import noteRoutes     from './routes/notes.routes';
import userNoteRoutes from './routes/user_notes.routes';

// ── Stage 4 routes ───────────────────────────────────────────────────────────
import aiRoutes from './routes/ai.routes';

// ── Stage 6 routes ───────────────────────────────────────────────────────────
import paymentRoutes from './routes/payment.routes';

// ── Stage 13 routes ───────────────────────────────────────────────────────────
import progressRoutes from './routes/progress.routes';

// ── Stage 14+ routes (new features) ──────────────────────────────────────────
import quizRoutes       from './routes/quiz.routes';
import emergencyRoutes  from './routes/emergency.routes';

// ── Day 5: Dashboard Intelligence ─────────────────────────────────────────────
import dashboardRoutes  from './routes/dashboard.routes';

// ── Day 11: Admin (subscription expiry cron) ──────────────────────────────────
import adminRoutes from './routes/admin.routes';

// ── Day 12: Chapter content (Maharashtra SSC board knowledge base) ─────────────
import chaptersRoutes from './routes/chapters.routes';

// ── Day 25: Search ────────────────────────────────────────────────────────────
import searchRoutes from './routes/search.routes';

// ── Day 34: Notifications ─────────────────────────────────────────────────────
import notificationRoutes from './routes/notifications.routes';

// ── Day 8: Webhook handler (imported directly for pre-json registration) ──────
import { handleWebhook } from './controllers/webhook.controller';

const app = express();

// ── request_id middleware — attach UUID to every request for log correlation ──
app.use((req, _res, next) => {
  req.requestId = randomUUID();
  next();
});

// ── Trust Railway / Vercel reverse proxy ─────────────────────────────────────
app.set('trust proxy', 1);

// ── Core middleware ──────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = config.CORS_ORIGIN
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/boardtopper-frontend-[a-z0-9]+-studymitraaidev-hues-projects\.vercel\.app$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── DAY 8: Webhook MUST be registered before express.json() ──────────────────
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => { handleWebhook(req, res).catch(next); }
);

app.use(express.json({ limit: '10kb' }));
app.use(generalLimiter);
app.use(requestLogger);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ data: { status: 'ok' }, error: null });
});

// ── Stage 2: Auth ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Stage 3: Core academic data ───────────────────────────────────────────────
app.use('/api/subjects', subjectRoutes);
app.use('/api/notes',      noteRoutes);
app.use('/api/user-notes', userNoteRoutes);
app.use('/api/schedule', scheduleRoutes);

// ── Stage 4: Gemini AI ────────────────────────────────────────────────────────
app.use('/api/ai', aiRoutes);

// ── Stage 6: Razorpay Payments ────────────────────────────────────────────────
app.use('/api/payments', paymentRoutes);

// ── Stage 13: Progress Tracker ────────────────────────────────────────────────
app.use('/api/progress', progressRoutes);

// ── Stage 14+: Quiz Attempts, Emergency Mode (Pro) ──────────
app.use('/api/quiz',      quizRoutes);
app.use('/api/emergency', emergencyRoutes);

// ── Day 5: Dashboard Intelligence ─────────────────────────────────────────────
app.use('/api/dashboard', dashboardRoutes);

// ── Day 11: Admin (subscription expiry cron) ──────────────────────────────────
app.use('/api/admin', adminRoutes);

// ── Day 12: Chapter content (Maharashtra SSC board knowledge base) ─────────────
app.use('/api/chapters', chaptersRoutes);

// ── Day 25: Search ────────────────────────────────────────────────────────────
app.use('/api/search', searchRoutes);

// ── Day 34: Notifications ─────────────────────────────────────────────────────
app.use('/api/notifications', notificationRoutes);

// ── 404 handler — must come after all routes ─────────────────────────────────
app.use(notFound);

// ── Sentry error handler — must be after all routes, before error handler ────
Sentry.setupExpressErrorHandler(app);

// ── Global error handler — must be last ──────────────────────────────────────
app.use(errorHandler);

export default app;

