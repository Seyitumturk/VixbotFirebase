// Require dependecies
const express = require('express');
const router = express.Router();
const path = require('path');
const withDbConnection = require('../utils/withDbConnection');
const cookieParser = require('cookie-parser');

const { auth, adminAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('../utils/firebaseConfig');




//Models 
const User = require('../models/Users');
const Business = require('../models/Businesses');
const Product = require('../models/Products');
const Template = require('../models/Template');
const Conversation = require('../models/Conversations.js');


const admin = require('firebase-admin');

const { Configuration, OpenAIApi } = require('openai');



// Authentication middleware to check if a user is logged in before proceeding to requested route

async function isAuthenticated(req, res, next) {
    const idToken = req.cookies.token;
    console.log('ID Token:', idToken);

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
        res.redirect('/templates');
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

    let progressCount = 0;

    // increment progress count for each completed field
    for(let key in req.body) {
        if(req.body[key] !== '') progressCount++;
    }

    // check if all fields are filled in
    let onboardingCompleted = progressCount === Object.keys(req.body).length;

    try {
        await newBusiness.save();
        await User.findByIdAndUpdate(req.user.id, { 
            $set: { 
                progress: progressCount, 
                onboarding_completed: onboardingCompleted 
            } 
        });
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
        const products = await Product.find({ user_id: req.user._id }); // Assuming your Product model has a user_id field

        const staticTemplates = [
            {name: 'Product Description', link: '/productDescription'},
            {name: 'Email Campaign', link: '/emailCampaignIdeas'},
            {name: 'Social Media Plan', link: '/socialMediaPlan'}
            // add the other static templates here
        ];

        let userProgress = req.user.progress; // Retrieve the progress
        let totalQuestions = 12; // Set this to the total number of fields for your business object
        let progressPercentage = (userProgress / totalQuestions) * 100;
        

        res.render('templates', { staticTemplates, templates: templates, products: products, progressPercentage: progressPercentage, totalQuestions: totalQuestions, progressCount: userProgress });
    } 
    
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve templates' });
    }
});


router.post('/create-template', isAuthenticated, async (req, res) => {
    const { template_name, template_details, prompt, product_id } = req.body;

    const user = await User.findById(req.user._id);

    const chosenBusiness = await Business.findOne({ user_id: user._id });

    try {
        const newTemplate = new Template({
            user_id: req.user._id,
            template_name: template_name,
            template_details: template_details,
            prompt: prompt,
            product_id: product_id,
            business_id: chosenBusiness
        });

        await newTemplate.save();

        res.json({ template: newTemplate });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create template' });
    }
});


router.get('/template/:id', isAuthenticated, async (req, res) => {
    try {
        const template = await Template.findOne({ _id: req.params.id, user_id: req.user._id });
        if (!template) {
            return res.status(404).send('Template not found');
        }
        res.render('generate', { template: template });  // This assumes you have a 'template.ejs' file to render individual templates
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to retrieve template' });
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


// MAIN` BABY

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


// Generic template - Created by the users. 



router.post('/generate-content', isAuthenticated, async (req, res) => {
    const { title, name, prompt, num_variations } = req.body;

    const configuration = new Configuration({
        organization: "org-JIjsH2CYD6sKM4gstuapQD1f",
        apiKey: "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"
    });

    const openai = new OpenAIApi(configuration);

    const promises = [];

    for (let i = 0; i < num_variations; i++) {
        promises.push(openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { "role": "system", "content": prompt },
                { "role": "user", "content": title },
                { "role": "assistant", "content": name },
            ],
            temperature: 0.5,
        }));
    }

    const results = await Promise.all(promises);

    const generatedContent = results.map(result => result.data.choices[0].message.content);

    res.json({ generatedContent });
});


// Static Templates 

router.get('/productDescription', (req, res) => {
    res.render('templated/productDescription');
});



router.post('/productDescription', isAuthenticated, async (req, res) => {
    const { productName, productFeatures, productBenefits, num_variations } = req.body;

    const configuration = new Configuration({
        organization: "org-JIjsH2CYD6sKM4gstuapQD1f",
        apiKey: "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"
    });

    const openai = new OpenAIApi(configuration);
    const promises = [];
    const prompt = `Generate a description for the product ${productName}, which has these features: ${productFeatures} and these benefits: ${productBenefits}`;

    for (let i = 0; i < num_variations; i++) {
        promises.push(openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { "role": "system", "content": prompt },
            ],
            temperature: 0.5,
        }));
    }

    const results = await Promise.all(promises);
    const generatedContent = results.map(result => result.data.choices[0].message.content);

    res.json({ generatedContent });
});



router.get('/socialMediaPlan', isAuthenticated, (req, res) => {
    res.render('templated/socialMediaPlan', { title: 'Social Media Plan' });
});


router.post('/socialMediaPlan', isAuthenticated, async (req, res) => {
    const { businessName, businessIndustry, num_variations } = req.body;

    const configuration = new Configuration({
        organization: "org-JIjsH2CYD6sKM4gstuapQD1f",
        apiKey: "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"
    });

    const openai = new OpenAIApi(configuration);
    const promises = [];
    const prompt = `Create a social media plan for a ${businessIndustry} business named ${businessName}`;

    for (let i = 0; i < num_variations; i++) {
        promises.push(openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { "role": "system", "content": prompt },
            ],
            temperature: 0.5,
        }));
    }

    const results = await Promise.all(promises);
    const generatedContent = results.map(result => result.data.choices[0].message.content);

    res.json({ generatedContent });
});

router.get('/emailCampaignIdeas', isAuthenticated, (req, res) => {
    res.render('templated/emailCampaignIdeas', { title: 'Email Campaign Ideas' });
});



router.post('/emailCampaignIdeas', isAuthenticated, async (req, res) => {
    const { businessName, targetAudience, num_variations } = req.body;

    const configuration = new Configuration({
        organization: "org-JIjsH2CYD6sKM4gstuapQD1f",
        apiKey: "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"
    });

    const openai = new OpenAIApi(configuration);
    const promises = [];
    const prompt = `Provide email campaign ideas for a business named ${businessName} targeting the following audience: ${targetAudience}`;

    for (let i = 0; i < num_variations; i++) {
        promises.push(openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { "role": "system", "content": prompt },
            ],
            temperature: 0.5,
        }));
    }

    const results = await Promise.all(promises);
    const generatedContent = results.map(result => result.data.choices[0].message.content);

    res.json({ generatedContent });
});



// export router object
module.exports = router;
