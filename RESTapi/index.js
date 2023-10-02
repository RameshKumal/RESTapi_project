const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();

const feedRoutes = require('./routes/feed-route');
const authRoutes = require('./routes/auth-route');

const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images');
    },
    filename: function (req, file, cb) {
        cb(null, uuidv4() + file.originalname)
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

//middleware for parsing the request body.
// app.use(express.urlencoded({ extended: false })) //for parsing the form-data
app.use(express.json()) //parse the json data
app.use(express.urlencoded({ extended: false }))
app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'))
// app.use(cors())
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
})

//serving image folder as static
app.use('/images', express.static(path.join(__dirname, 'images')));

//routes
app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

//customized error handling middleware
app.use((error, req, res, next) => {
    const { statusCode, message, data } = error;
    res.status(statusCode).json({ message: message, data: data });
    next();
})

mongoose.connect(process.env.mongoDB_url)
    .then(result => {
        const server = app.listen(4000, () => {
            console.log(`The server listening at port ${4000}`);
        })
        const io = require('./socket').init(server);
        io.on('connection', socket => {
            console.log('client connected')
        })
    })
    .catch(err => console.log(err))