import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined. Set it in server/.env or the environment.');
}

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const tokenCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('blw_auth_token='));

  if (!tokenCookie) {
    return null;
  }

  return decodeURIComponent(tokenCookie.split('=')[1] || '');
};

export const authenticateToken = (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: 'Authorization token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = decoded.user;
    req.token = token;
    next();
  });
};
