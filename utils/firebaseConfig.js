const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');


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

module.exports = {
    firebaseConfig,
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword

};
