import jwt from 'jsonwebtoken';

function authSecret() {
  const secret = typeof process.env.JWT_SECRET === 'string' ? process.env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
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
