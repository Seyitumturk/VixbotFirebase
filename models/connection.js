const mongoose = require('mongoose');

const mongoURI = 'mongodb://localhost:27017/vixbott';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

db.once('open', () => {
    console.log('MongoDB connection successful.');
});

module.exports = db;
