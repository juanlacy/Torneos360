import { logRequest } from '../config/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    logRequest(req, res, Date.now() - start);
  });

  next();
};
