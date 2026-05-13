type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, meta?: unknown): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (meta !== undefined && meta !== null) {
    if (meta instanceof Error) {
      entry['error'] = { message: meta.message, stack: meta.stack, name: meta.name };
    } else {
      entry['meta'] = meta;
    }
  }
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info:  (message: string, meta?: unknown) => log('info',  message, meta),
  warn:  (message: string, meta?: unknown) => log('warn',  message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};

export default logger;
