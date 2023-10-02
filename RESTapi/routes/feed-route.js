const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const isAuth = require("../middleware/auth-middleware");

const { getFeeds, createPost, getSinglePost, deletePost, updatePost, getStatus, postUpdateStatus } = require('../controllers/feed-controller');

// @feed/posts
router.get('/status', isAuth, getStatus);

router.get('/posts', isAuth, getFeeds);

router.patch('/update-status', isAuth, [
    body('status')
        .trim()
        .not()
        .isEmpty()
], postUpdateStatus)

router.post('/post', isAuth,
    [body('title')
        .trim()
        .isLength({ min: 5 }),
    body('content')
        .trim()
        .isLength({ min: 5 })], createPost);

router.get('/post/:postId', isAuth, getSinglePost);

router.delete('/post/:postId', isAuth, deletePost);

router.put('/post/:postId', isAuth,
    [body('title')
        .trim()
        .isLength({ min: 5 }),
    body('content')
        .trim()
        .isLength({ min: 5 })], updatePost);


module.exports = router;