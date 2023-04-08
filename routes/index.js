// Require dependecies
const express = require('express');
const router = express.Router();
const path = require('path');
const withDbConnection = require('../utils/withDbConnection');
const cookieParser = require('cookie-parser');

const { auth, adminAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('../utils/firebaseConfig');




//Models 

const Product = require('../models/Products');
const Template = require('../models/Templates');
const Business = require('../models/businesses');
const User = require('../models/Users');




const { Configuration, OpenAIApi } = require('openai');

let usersCollection;


// Authentication middleware to check if a user is logged in before proceeding to requested route


const admin = require('firebase-admin');

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

        res.send(`User created with UID: ${user.uid}`);
    } catch (error) {
        res.status(400).send(`Error: ${error.message}`);
    }
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
        res.redirect('/onboarding');
    } catch (error) {
        res.status(400).send(`Error: ${error.message}`);
    }
});



//Template Routes

router.get('/templates', isAuthenticated, (req, res) => {  // Render maps page if user is logged in
    res.render('pages/templates');
});
router.post('/create-template', isAuthenticated, async (req, res) => {
    try {
        const templateData = req.body;

        // Create a new template object with the request data
        const template = new Template({
            user_id: req.user._id,
            template_name: templateData.product_name,
            main_feature: templateData.main_feature,
            unique_selling_points: templateData.unique_selling_points,
            pricing_model: templateData.pricing_model,
            distribution_channels: templateData.distribution_channels,
        });

        // Save the template to the database
        const result = await template.save();

        // Render the template card template with the new template data
        res.render('partials/template-card', { template: result }, (err, html) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to render template-card template' });
            } else {
                // Send the template card HTML back to the client
                res.send(html);
            }
        });
    } catch (err) {
        console.error(err);

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            res.status(400).json({ error: errors });
        } else {
            res.status(500).json({ error: 'Failed to create template' });
        }
    }
});
router.get('/get_templates', isAuthenticated, async (req, res) => {
    const templates = await Template.find({ user_id: req.user._id });
    res.json(templates);
});



// Product Routes

router.get('/products', isAuthenticated, async (req, res) => {
    const user = await User.findById(req.user._id);

    const businesses = await Business.find({ user_id: user._id });


    try {
        const products = await Product.find({ user_id: req.user._id });
        res.render('pages/products', { products: products, businesses });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve products' });
    }
});

router.post('/create-product', isAuthenticated, async (req, res) => {
    try {
        const productData = req.body;

        // Create a new product object with the request data
        const product = new Product({
            user_id: req.user._id,
            product_name: productData.product_name,
            main_features: productData.main_features,
            unique_selling_points: productData.unique_selling_points,
            pricing_model: productData.pricing_model,
            distribution_channels: productData.distribution_channels,
        });

        // Save the product to the database
        const result = await product.save();

        // Render the product card template with the new product data
        res.render('partials/product-card', { product: result }, (err, html) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Failed to render product card template' });
            } else {
                // Send the product card HTML back to the client
                res.send(html);
            }
        });
    } catch (err) {
        console.error(err);

        // Handle validation errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            res.status(400).json({ error: errors });
        } else {
            res.status(500).json({ error: 'Failed to create product' });
        }
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
        const businesses = await Business.find({ user_id: user._id });
        const chosenBusinessId = req.query.business_id;
        const chosenBusiness = businesses.find(business => business._id.toString() === chosenBusinessId);

        const products = await Product.find({ user_id: req.user._id }); // Retrieve the products from the database
        const templates = 'New Template'; // Replace this with the selected product name

        // Pass the businesses, products, and chosenBusiness variables to the conversations.ejs file
        res.render('conversations', { businesses, products, chosenBusiness });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// MAIN BABY

router.post('/conversations', isAuthenticated, async (req, res) => {

    const { messages, temperature, product, chosenBusiness } = req.body;
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
    })
    console.log(messages);
    console.log(completion.data.choices[0].message);
    const botMessage = completion.data.choices[0].message.content;
    res.json({ response: botMessage });


});







// export router object
module.exports = router;
