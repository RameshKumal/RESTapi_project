const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const Post = require('../models/post-model');
const User = require('../models/user-model');
const io = require('../socket');

exports.getFeeds = async (req, res, next) => {
    try {
        const currentPage = parseInt(req.query.page) || 1;
        const perPage = 3;

        const totalItems = await Post.countDocuments();
        const posts = await Post.find().populate('creator').skip((currentPage - 1) * perPage)
            .sort({ createdAt: -1 })
            .limit(perPage)

        res.status(200).json({ message: "posts fetched successfully.", posts: posts, totalItems: totalItems })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.createPost = async (req, res, next) => {
    try {
        let errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error('validation is failed, entered data is incorrect!');
            error.statusCode = 422;
            throw error;
        }
        if (!req.file) {
            const error = new Error("Image is not provided");
            error.statusCode = 422;
            throw error;
        }

        const imageUrl = req.file.path.replace("\\", "/");
        const { title, content } = req.body;
        const post = await Post({
            title: title,
            content: content,
            imageUrl: imageUrl,
            creator: req.userId,
        }).save();

        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        //creating everywhere using the socket
        io.getIO().emit('posts', { action: 'create', post: { ...post._doc, creator: { _id: req.userId, name: user.name } } });
        res.status(201).json({
            message: "post created successfully!",
            post: post,
            creator: { id: user._id, name: user.name }
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getSinglePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            if (!post) {
                const error = new Error("Post could not found");
                error.statusCode = 404;
                throw error;
            }
        }
        res.status(200).json({ message: "single post fetched successfully", post: post })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.deletePost = async (req, res, next) => {
    try {
        const postId = req.params.postId;

        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Post is not found');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not Authorised');
            error.statusCode = 403;
            throw error;
        }

        await clearImage(post.imageUrl);
        await Post.findByIdAndRemove(postId);

        const user = await User.findById(req.userId);
        user.posts.pull(postId)
        await user.save()
        io.getIO().emit('posts', { action: 'delete', post: postId })
        res.status(200).json({ message: "deleted successfully" });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.updatePost = async (req, res, next) => {
    try {
        let errors = validationResult(req);

        if (!errors.isEmpty()) {
            const error = new Error("validation failed, invalid input");
            error.statusCode = 422;
            throw error;
        }
        const postId = req.params.postId;
        let imageUrl = req.body.image;
        const { title, content } = req.body;
        if (req.file) {
            imageUrl = req.file.path.replace("\\", "/");
        }
        if (!imageUrl) {
            const error = new Error("Image is not provided.");
            error.statusCode = 422;
            throw error;
        }
        const post = await Post.findById(postId).populate('creator');

        if (!post) {
            const error = new Error("post could not found");
            error.statusCode = 404;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not Authorised');
            error.statusCode = 403;
            throw error;
        }
        //if image is updated then we will clear the previous image.
        if (imageUrl !== post.imageUrl) {
            await clearImage(post.imageUrl)
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        await post.save();
        io.getIO().emit('posts', { action: 'update', post: post })
        res.status(201).json({ message: "updated successfully", post: post })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.getStatus = async (req, res, next) => {
    try {
        const userId = req.userId;

        const user = await User.findById({ _id: userId })
        if (!user) {
            const error = new Error("User not Found!");
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({ message: "successfully fetched the status", user: user });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.postUpdateStatus = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const error = new Error("validation failed, invalid input");
            error.statusCode = 422;
            throw error;
        }
        const userId = req.userId;
        const { status } = req.body;

        const user = await User.findById(userId)
        if (!user) {
            const error = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }
        user.status = status;
        await user.save();

        res.status(201).json({ message: "user status updated successfully", user: user });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

const clearImage = async filepath => {
    filepath = path.join(__dirname, '..', filepath);
    fs.unlink(filepath, err => console.log(err))
}