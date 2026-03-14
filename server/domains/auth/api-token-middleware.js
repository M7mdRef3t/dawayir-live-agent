import { isApiTokenValid, readApiToken } from './token.js';

export const createApiTokenMiddleware = () => {
  const configuredToken = readApiToken();
  return (req, res, next) => {
    if (!configuredToken) return next();
    const headerToken = req.headers['x-dawayir-auth'];
    if (!isApiTokenValid(headerToken, configuredToken)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    return next();
  };
};

