const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect } = require('../middleware/authMiddleware');

// GET /api/posts/:postId/comments - Get all comments for a post
router.get('/:postId/comments', async (req, res) => {
     try {
        const { postId } = req.params;
        const result = await db.query(
            `SELECT c.*, u.username
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id =$1
            ORDER BY c.created_at DESC`,
            [postId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Error fetching comments'});
    }
});

router.post('/:postId/comments', protect, async (req, res) => {
    const { content } = req.body;
    const { postId } = req.params;    
    const userId = req.user.id;
    

    if (!content) {
        return res.status(400).json({ message: 'Comment content is required'});
    }

    try {
       
        const insertResult= await db.query(
            'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [postId, userId, content]            
        );

        const newCommentId = insertResult.rows[0].id;

        const commentWithUser = await db.query(
            `SELECT c.*, u.username
            FROM comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.id =$1`,
            [newCommentId]
        );

        res.status(201).json(commentWithUser.rows[0]);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({message: 'Server error saving comments'});
    }
});

//DELETE /api/posts/:postId/comments/:commentId
router.delete('/:postId/comments/:commentId', protect, async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        const result = await db.query(
            'DELETE FROM comments WHERE id = $1 AND user_id =$2 RETURNING *',
            [commentId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(403).json({message: "You can only delete your own comments"});  
        }

        res.json({ message: "Comment deleted successfully"});
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error deleting comment"});
    }
});


module.exports = router;