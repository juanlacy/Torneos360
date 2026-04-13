import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';

const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) msg += `\n${JSON.stringify(meta, null, 2)}`;
    return msg;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: isDev ? devFormat : prodFormat,
    level: isDev ? 'debug' : 'info',
  }),
];

if (!isDev || process.env.ENABLE_FILE_LOGS === 'true') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: prodFormat }),
    new winston.transports.File({ filename: 'logs/combined.log', format: prodFormat })
  );
}

const logger = winston.createLogger({ transports, exitOnError: false });

export const logRequest = (req, res, responseTime) => {
  const data = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id || 'anon',
    status: res.statusCode,
    ms: `${responseTime}ms`,
  };
  res.statusCode >= 400 ? logger.warn('HTTP', data) : logger.http('HTTP', data);
};

export const logAuth = (event, userId, details = {}) => {
  logger.info('Auth', { event, userId, ...details });
};

export const logSystem = (msg, level = 'info', details = {}) => {
  logger[level](msg, details);
};

export default logger;
