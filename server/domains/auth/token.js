import crypto from 'crypto';

export const normalizeUserKey = (value) => {
  const normalized = String(value || 'anonymous').trim().slice(0, 120);
  return normalized || 'anonymous';
};

export const buildBoundUserKeyFromToken = (token) => {
  const digest = crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
  return `auth_${digest.slice(0, 24)}`;
};

export const readApiToken = () => String(process.env.DWR_API_TOKEN || '').trim();

export const isApiTokenValid = (providedToken, configuredToken = readApiToken()) => {
  if (!configuredToken) return true;
  return String(providedToken || '').trim() === configuredToken;
};

export const resolveSessionUserKey = ({
  requestedUserKey,
  wsToken,
  configuredToken = readApiToken(),
}) => {
  if (configuredToken) {
    return buildBoundUserKeyFromToken(wsToken || configuredToken);
  }
  return normalizeUserKey(requestedUserKey);
};

