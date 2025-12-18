require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/authRoutes');

const commentRoutes = require('./routes/commentRoutes');


const app = express();
const PORT = process.env.PORT|| 10000;

app.use(cors({
    origin: ['https://newsdrop-frontend.vercel.app',
             'http://localhost:5173',
             'http://127.0.0.1:5173'
            ],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

//function to create complex JOIN query
const allPostsQuery = `
    SELECT posts.*, users.username AS author_username,
    json_build_object('id', categories.category_id, 'name', categories.name, 'slug', categories.slug, 'imageUrl', categories.image_url) AS category
    FROM posts 
    JOIN users ON posts.author_id = users.user_id
    JOIN categories ON posts.category_id = categories.category_id`

// AUTH Route
app.use('/api/auth', authRoutes);

// API Route to get all featured 

app.get('/api/posts/featured', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM posts WHERE type = $1 ORDER BY created_at DESC',
            ['featured']
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching featured posts:', err);
        res.status(500).json({erro: 'Failed to retrieve featured posts'});
    }
});
    
// API Route to get all categories
app.get('/api/categories', async (req, res) => {
    try {
        // Select all necessary fields for the footer (name, slug)
        const result = await db.query('SELECT name, slug, "image_url" FROM categories ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Server Error fetching categories');
    }
});

// API Route to get a single post by ID
app.get('/api/posts/:id', async (req, res) => {
    const { id } = req.params; // Extract ID from the URL parameter
    try {
        //Query to select the post where the ID matches URL parameter
        const result = await db.query(allPostsQuery + ` WHERE posts.id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({message: 'Post not found'});
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching post');
    }
});

// API Route to get all posts with author usernames
app.get('/api/posts', async (req, res) => {

    const categorySlug = req.query.categorySlug;
    let finalQuery = allPostsQuery;
    let queryParams = [];

    if (categorySlug) {
        finalQuery += ` WHERE categories.slug = $1`;
        queryParams.push(categorySlug);
    }

    finalQuery += ` ORDER BY date DESC`;
    try {
        // Execute SQL query to select all data from table name posts
        const result = await db.query(finalQuery, queryParams);
        res.json(result.rows); // send results back as JSON
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error fetching posts');
    }
});

// API Route for subscribers
app.post('/api/subscribers', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        // Check if already subscribed
        const existing = await db.query('SELECT email FROM subscribers WHERE email =$1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        // Insert new subscriber
        await db.query('INSERT INTO subscribers (email) VALUES ($1)', [email]);

        res.status(201).json({message: 'Successfully subscribed'});
    } catch(err) {
        console.error('Database error during subscription:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// API Route to get comments
app.use('/api/posts', commentRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT} `);
});
