const express = require('express');
const { db } = require('../config/postgres');
const { eq } = require('drizzle-orm');
const { usersTable, userSessionsTable } = require('../db/schema');
const { randomBytes, createHmac } = require('node:crypto');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.get('/users', async (req, res) => {
    const sessionId = req.headers['session-id'];
    if (!sessionId) {
        return res.status(401).json({ error: 'You are not logged in' });
    }
    const [data] = await db.select({ id: userSessionsTable.id, userId: userSessionsTable.userId }).from(userSessionsTable).rightJoin(usersTable, eq(userSessionsTable.userId, usersTable.id)).where(eq(userSessionsTable.id, sessionId));

    if (!data) {
        return res.status(401).json({ error: 'You are not logged in' });
    }
    return res.json({ message: 'you are logged in', sessionId: data.id });
});

router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const [existingUser] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.email, email));
    if (existingUser) {
        return res.status(400).json({ error: `user with email ${email} already exists` });
    }
    const salt = randomBytes(256).toString('hex');
    const hashedPassword = createHmac('sha256', salt).update(password).digest('hex');
    const [user] = await db.insert(usersTable).values({
        name, email, password: hashedPassword, salt,
    }).returning({ id: usersTable.id });
    return res.status(201).json({ message: 'user created successfully' });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const [existingUser] = await db.select({ id: usersTable.id, email: usersTable.email, salt: usersTable.salt, password: usersTable.password, name: usersTable.name }).from(usersTable).where(eq(usersTable.email, email));
    if (!existingUser) {
        return res.status(401).json({ error: `user with email ${email} not found` });
    }
    const salt = existingUser.salt;
    const existingHash = existingUser.password;
    const newhash = createHmac('sha256', salt).update(password).digest('hex');
    if (existingHash !== newhash) {
        return res.status(401).json({ error: 'invalid credentials' });
    }
    // generate a session for user
    const session = await db.insert(userSessionsTable).values({
        userId: existingUser.id,
        sessionToken: randomBytes(256).toString('hex'),
    }).returning({ id: userSessionsTable.id });
    const payload = {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    return res.status(200).json({ message: 'success', token });
});

module.exports = router;
