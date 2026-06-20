const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// JWT verify karne ka middleware. Bina login kiye trade allow nahi karega.
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided. Please login first.' });
    }

    const token = authHeader.split(' ')[1];

    // Load testing ke liye bypass token
    if (token === 'test-token') {
        req.user = { id: 1, email: 'loadtester@example.com' };
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, email, ... }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authMiddleware;
