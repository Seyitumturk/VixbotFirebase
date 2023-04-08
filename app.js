const express = require('express');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const MongoClient = require('mongodb').MongoClient;
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

const firebaseConfig = {
    apiKey: "AIzaSyAAdOi7-xZAtr6wg94tWgkBdzfHFqaMaks",
    authDomain: "vixbot-16ec8.firebaseapp.com",
    projectId: "vixbot-16ec8",
    storageBucket: "vixbot-16ec8.appspot.com",
    messagingSenderId: "650457800107",
    appId: "1:650457800107:web:7a8b8f773472629375c6ee",
    measurementId: "G-W0663TH0XQ"
};

const uri = "mongodb://localhost:27017/vbfb";

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let usersCollection;

async function withDbConnection(req, res, next) {
    if (!client.isConnected) {
        try {
            await client.connect();
            console.log("Connected to MongoDB");
            usersCollection = client.db("vbfb").collection("users");
        } catch (err) {
            return next(err);
        }
    }
    return next();
}



initializeApp(firebaseConfig);
const auth = getAuth();

app.post('/register', withDbConnection, async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        usersCollection.updateOne(
            { uid: user.uid },
            { $set: { email: user.email } },
            { upsert: true }
        );

        res.send(`User created with UID: ${user.uid}`);
    } catch (error) {
        res.status(400).send(`Error: ${error.message}`);
    }
});

app.post('/login', withDbConnection, async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        res.send(`User signed in with UID: ${user.uid}`);
    } catch (error) {
        res.status(400).send(`Error: ${error.message}`);
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
