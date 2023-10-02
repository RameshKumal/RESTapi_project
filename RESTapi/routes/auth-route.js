const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const User = require('../models/user-model');
const { signUp, login } = require('../controllers/auth-controller');

router.put('/signup',
    [
        body('email')
            .isEmail()
            .withMessage('Please enter valid email')
            .custom((value, { req }) => {
                return User.findOne({ email: value })
                    .then(userDoc => {
                        if (userDoc) {
                            return Promise.reject('E-mail address already exist!');
                        }
                    })
            })
            .normalizeEmail(),
        body('password')
            .trim()
            .isLength({ min: 5 }),
        body('name')
            .trim()
            .not()
            .isEmpty()
    ], signUp);

router.post('/login', login);

module.exports = router;