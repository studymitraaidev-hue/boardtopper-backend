import http from 'http';
import app from './app';
import config from './config/env';
import logger from './utils/logger';

const server = http.createServer(app);

server.listen(config.PORT, () => {
  logger.info(`BoardTopper API running on port ${config.PORT} in ${config.NODE_ENV} mode`);
});

process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}\n${error.stack ?? ''}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Rejection: ${message}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed. Process exiting.');
    process.exit(0);
  });
});
