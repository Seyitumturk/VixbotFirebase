// Require dependecies
const express = require('express');
const router = express.Router();
const path = require('path');
const withDbConnection = require('../utils/withDbConnection');
const cookieParser = require('cookie-parser');

const { auth, adminAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('../utils/firebaseConfig');




//Models 
const User = require('../models/Users');
const Business = require('../models/businesses');
const Product = require('../models/Products');
const Template = require('../models/Template');
const Conversation = require('../models/Conversations.js');


const admin = require('firebase-admin');

const { Configuration, OpenAIApi } = require('openai');



// Authentication middleware to check if a user is logged in before proceeding to requested route

async function isAuthenticated(req, res, next) {
    const idToken = req.cookies.token;
    console.log('ID Token:', idToken); // Add this line

    if (idToken) {
        try {
            // Verify the ID token with Firebase Admin SDK
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            // Check if the user exists in your MongoDB database
            const user = await User.findOne({ email: decodedToken.email });
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Set the user object on the request to use later in other routes
            req.user = user;
            next();
        } catch (error) {
            console.error('Error in isAuthenticated middleware:', error); // Add this line
            return res.status(401).json({ error: 'Unauthorized' });
        }
    } else {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}



// Login routes 

router.get('/', (req, res) => {
    res.render('login');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});


router.post('/register', withDbConnection, async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        req.usersCollection.updateOne(
            { uid: user.uid },
            { $set: { email: user.email } },
            { upsert: true }
        );

    } catch (error) {
        res.status(400).send(`Error: ${error.message}`);
    }

    res.redirect('/onboarding');

});


router.post('/login', withDbConnection, async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const idToken = await user.getIdToken();

        // Set the ID token as a cookie named 'token'
        res.cookie('token', idToken, { httpOnly: true });
        res.redirect('/conversations');
    } catch (error) {
        res.status(400).send(`Error: ${error.message}`);
    }
});


// Onboarding Routes : 

router.get('/onboarding', isAuthenticated, (req, res) => {
    res.render('onboarding');
});

router.post('/onboarding/create-business', isAuthenticated, async (req, res) => {
    const {
        name,
        industry,
        occupation,
        stands_for,
        communication_tone,
        main_competitors,
        strengths,
        weaknesses,
        typical_growth,
        teamsize_and_structure,
        company_culture,
        main_bussiness_goals,
        gpt_business_summary
    } = req.body;

    const newBusiness = new Business({
        user_id: req.user.id,
        name,
        industry,
        occupation,
        stands_for,
        communication_tone,
        main_competitors,
        strengths,
        weaknesses,
        typical_growth,
        teamsize_and_structure,
        company_culture,
        main_bussiness_goals,
        gpt_business_summary
    });

    try {
        await newBusiness.save();
        await User.findByIdAndUpdate(req.user.id, { $set: { onboarding_completed: true } });
        res.redirect('/conversations');
    } catch (err) {
        console.error(err);
        res.render('pages/conversations', { error: 'Failed to create the business. Please try again.' });
    }
});



//Template Routes


router.get('/templates', isAuthenticated, async (req, res) => {
    try {
        const templates = await Template.find({ user_id: req.user._id });
        res.render('templates', { templates: templates });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve templates' });
    }
});

router.post('/create-template', isAuthenticated, async (req, res) => {
    const { template_name, template_details } = req.body;

    try {
        const newTemplate = new Template({
            user_id: req.user._id,
            template_name: template_name,
            template_details: template_details,
        });

        await newTemplate.save();

        res.json({ template: newTemplate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create template' });
    }
});



// Product Routes

router.get('/products', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.user._id);

    const businesses = await Business.find({ user_id: user._id });


    try {
        const products = await Product.find({ user_id: req.user._id });
        res.render('products', { products: products, businesses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve products' });
    }
});

router.post('/create-product', isAuthenticated, async (req, res) => {
    const { product_name, main_features, unique_selling_points, pricing_model, distribution_channels } = req.body;

    try {
        const newProduct = new Product({
            user_id: req.user._id,
            product_name: product_name,
            main_features: main_features,
            unique_selling_points: unique_selling_points,
            pricing_model: pricing_model,
            distribution_channels: distribution_channels
        });

        await newProduct.save();

        res.json({ template: newProduct }); // The front-end code expects a JSON response with a "template" property
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});


router.get('/get_businesses', isAuthenticated, async (req, res) => {
    const businesses = await Business.find({ user_id: req.user._id });
    res.json(businesses);
});

router.post('/set_selected_business', isAuthenticated, async (req, res) => {
    try {
        const businessId = req.body.businessId;
        req.session.selectedBusinessId = businessId;
        res.status(200).json({ message: 'Business ID updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to set selected business ID' });
    }
});




// Openai Routes

router.get('/conversations', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const business = await Business.findOne({ user_id: user._id });

        const templates = await Template.find({ user_id: req.user._id }).lean().exec();
        console.log(req.user._id)

        console.log(templates)

        const products = await Product.find({ user_id: req.user._id }); // Retrieve the products from the database

        // Pass the business and products and templatevariables to the conversations.ejs file
        res.render('conversations', { business, products, templates });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// MAIN BABY

router.post('/conversations', isAuthenticated, async (req, res) => {
    console.log(req.body);
    const user = await User.findById(req.user._id);
    const chosenBusiness = await Business.findOne({ user_id: user._id });

    const { messages, temperature, product } = req.body;
    const promptBody = `You are a helpful assistant. Your user's business is: ${chosenBusiness.name}, which operates in the ${chosenBusiness.industry} industry. They are focused on ${chosenBusiness.stands_for}, and their main competitors are ${chosenBusiness.main_competitors}. Their strengths are ${chosenBusiness.strengths}, and their weaknesses are ${chosenBusiness.weaknesses}. Their typical growth rate is ${chosenBusiness.typical_growth}, and their team size and structure are ${chosenBusiness.teamsize_and_structure}. Their company culture is described as ${chosenBusiness.company_culture}, and their main business goals are ${chosenBusiness.main_bussiness_goals} .Your user's selected product is: ${product.product_name}. Its main features are: ${product.main_features}. Its unique selling points are: ${product.unique_selling_points}. The pricing model is: ${product.pricing_model}. The distribution channels are: ${product.distribution_channels}.`;

    const configuration = new Configuration({
        organization: "org-JIjsH2CYD6sKM4gstuapQD1f",
        apiKey: "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"
    })

    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [
            { "role": "system", "content": promptBody }
            , ...messages
            // { role: "user", content: "Hello World" },
        ],
        temperature: temperature,
    });
    console.log(messages);
    console.log(completion.data.choices[0].message);
    const botMessage = completion.data.choices[0].message.content;

    // Save the conversation

    const conversation = new Conversation({
        user: req.user._id,
        context: promptBody,


    });

    await conversation.save();

    res.json({ response: botMessage });
});

// export router object
module.exports = router;
