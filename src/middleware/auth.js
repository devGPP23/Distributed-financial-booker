const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * JWT Authentication Middleware
 * Protects routes so only logged-in users can trade.
 * 
 * How it works:
 * 1. Client sends a request with header: Authorization: Bearer <token>
 * 2. We decode the token to get the user's ID
 * 3. We attach the user to req.user so controllers can use it
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided. Please login first.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, ... }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;
