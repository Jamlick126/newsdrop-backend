const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const generateToken = (id, username) => {
    return jwt.sign(
        { id },process.env.JWT_SECRET,
        { expiresIn: '30d',}
    );
};

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields.'});
    }

    try {
        let result = await db.query('SELECT user_id FROM users WHERE email =$1', [email]);
        if (result.rows.length > 0 ) {
            return res.status(400).json({ message: 'Email already exists.'});
        }

        result = await db.query('SELECT user_id FROM users WHERE username =$1', [username]);
        if (result.rows.length > 0) {
            return res.status(400).json({ message: 'Username already exists.'});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserResult = await db.query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email',
            [username, email, hashedPassword]
        );

        const newUser = newUserResult.rows[0];
        const token = generateToken(newUser.user_id, newUser.username);

        res.status(201).json({
            message: 'User created successfully.',
            user: {
                id: newUser.user_id,
                username: newUser.username,
                email: newUser.email,
                token: token
            },   
        });
    } catch (err) {
        console.error('Database Error during signup:', err);
        res.status(500).json({ message: 'Server error during signup.'});
    }
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email=$1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password.'});  
        }

        const user = result.rows[0];
        
        // compare passwords
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message:'Invalid email or password.'});
        }

        const token = generateToken(user.user_id, user.username);

        res.json({
            message: 'Logged in successfully.',
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                token: token
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during Login'});
    }
});

module.exports = router;