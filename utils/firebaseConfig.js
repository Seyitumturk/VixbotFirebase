const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, verifyIdToken } = require('@firebase/auth');
const admin = require("firebase-admin");

const firebaseConfig = {
    apiKey: "AIzaSyAAdOi7-xZAtr6wg94tWgkBdzfHFqaMaks",
    authDomain: "vixbot-16ec8.firebaseapp.com",
    projectId: "vixbot-16ec8",
    storageBucket: "vixbot-16ec8.appspot.com",
    messagingSenderId: "650457800107",
    appId: "1:650457800107:web:7a8b8f773472629375c6ee",
    measurementId: "G-W0663TH0XQ"
};

initializeApp(firebaseConfig);

const auth = getAuth();


admin.initializeApp({
    credential: admin.credential.cert("./keyfile/vixbot-16ec8-firebase-adminsdk-bmf0d-4d6662e21a.json"),
});

const adminAuth = admin.auth();

module.exports = {
    firebaseConfig,
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    verifyIdToken
};
