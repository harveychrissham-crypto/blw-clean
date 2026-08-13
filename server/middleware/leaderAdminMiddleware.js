import jwt from 'jsonwebtoken';

const DEFAULT_ACCESS_CODE = '1120363';

function authSecret() {
  const configured = typeof process.env.JWT_SECRET === 'string' ? process.env.JWT_SECRET.trim() : '';
  const code = typeof process.env.FELLOWSHIP_ADMIN_ACCESS_CODE === 'string' && process.env.FELLOWSHIP_ADMIN_ACCESS_CODE.trim()
    ? process.env.FELLOWSHIP_ADMIN_ACCESS_CODE.trim()
    : DEFAULT_ACCESS_CODE;
  return configured || `blw-leader-auth:${code}`;
}

export function requireLeaderAdmin(req, res, next) {
  const authorization = req.headers.authorization || req.headers.Authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Leadership authorization is required.' });
  }
  try {
    const token = authorization.slice(7).trim();
    const payload = jwt.verify(token, authSecret());
    if (payload?.leaderAdmin !== true) return res.status(403).json({ error: 'Leadership authorization is required.' });
    req.leaderAdmin = true;
    next();
  } catch {
    return res.status(403).json({ error: 'Leadership authorization is required.' });
  }
}
