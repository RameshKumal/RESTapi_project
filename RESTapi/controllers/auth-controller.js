const { validationResult } = require('express-validator')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/user-model')

exports.signUp = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const error = new Error("Validation failed");
            error.statusCode = 422;
            error.data = errors.array();
            throw error;
        }
        const { email, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12)
        const user = new User({
            email,
            password: hashedPassword,
            name
        })

        await user.save()
        res.status(201).json({ message: "user created successfuly", userId: user._id });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }


}

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email })
        if (!user) {
            const error = new Error("User not Found");
            error.statusCode = 404;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password)
        if (!isEqual) {
            const error = new Error("Wrong password");
            error.statusCode = 401;
            throw error;
        }
        //generate the json web token  
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString()
        },
            'this is the secret 237!!@#$UY',
            { expiresIn: '1h' });

        res.status(200).json({ message: "Successfully logged in", token: token, userId: user._id.toString() })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}