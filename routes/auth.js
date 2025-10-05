const express = require('express');
const User = require('../models/user');
const Order = require('../models/orders');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const axios = require('axios');
const fetch = require('../middleware/fetch-details');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

if (!jwtSecret) {
    console.error("JWT_SECRET is not defined in environment variables!");
    process.exit(1);
}

router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: "Server is working",
        timestamp: new Date().toISOString(),
        userModel: !!User,
        jwtSecret: !!jwtSecret,
        jwtSecretLength: jwtSecret ? jwtSecret.length : 0
    });
});

router.post('/createuser', [
    body('email').isEmail(),
    body('password').isLength({ min: 5 }),
    body('name').isLength({ min: 3 })
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }
    const salt = await bcrypt.genSalt(10);
    let securePass = await bcrypt.hash(req.body.password, salt);
    try {
        console.log("Creating user with data:", {
            name: req.body.name,
            email: req.body.email,
            hasPassword: !!req.body.password,
        });
        
        await User.create({
            name: req.body.name,
            password: securePass,
            email: req.body.email,
        }).then(user => {
            const data = {
                user: {
                    id: user.id
                }
            };
            const authToken = jwt.sign(data, jwtSecret);
            success = true;
            res.json({ success, authToken });
        })
            .catch(err => {
                console.log("Database error:", err);
                if (err.code === 11000) {
                    res.status(400).json({ 
                        success: false, 
                        error: "This email is already registered. Please use a different email or try logging in instead." 
                    });
                } else {
                    res.status(500).json({ 
                        success: false, 
                        error: "Failed to create account. Please try again." 
                    });
                }
            });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ 
            success: false, 
            error: "Server error occurred. Please try again." 
        });
    }
});

router.post('/login', [
    body('email', "Enter a Valid Email").isEmail(),
    body('password', "Password cannot be blank").exists(),
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success, error: "Try Logging in with correct credentials" });
        }

        const pwdCompare = await bcrypt.compare(password, user.password);
        if (!pwdCompare) {
            return res.status(400).json({ success, error: "Try Logging in with correct credentials" });
        }
        const data = {
            user: {
                id: user.id
            }
        };
        success = true;
        const authToken = jwt.sign(data, jwtSecret);
        res.json({ success, authToken });

    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Server error occurred. Please try again." 
        });
    }
});

router.post('/google-auth', async (req, res) => {
    try {
        const { credential } = req.body;
        
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const { email, name, sub: googleId, picture } = payload;
        
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.create({
                name,
                email,
                password: await bcrypt.hash(googleId, 10),
                location: ""
            });
        }
        
        const data = {
            user: {
                id: user.id
            }
        };
        
        const authToken = jwt.sign(data, jwtSecret);
        res.json({ 
            success: true, 
            authToken,
            userName: user.name,
            userEmail: user.email
        });
        
    } catch (error) {
        console.error("Google auth error:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Google authentication failed. Please try again." 
        });
    }
});

router.post('/getuser', fetch, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");
        res.send(user);
    } catch (error) {
        console.error(error.message);
        res.send("Server Error");
    }
});

router.put('/updateuser', fetch, [
    body('name').isLength({ min: 3 }),
    body('location').optional(),
    body('mobile').optional()
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ success, errors: errors.array(), error: "Validation failed" });
    }

    try {
        const userId = req.user.id;
        const { name, location, mobile } = req.body;
        
        console.log("Updating user:", userId);
        console.log("New name:", name);
        console.log("New location:", location);
        console.log("New mobile:", mobile);
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                name, 
                location: location || "", 
                mobile: mobile || "" 
            },
            { new: true }
        ).select("-password");

        if (updatedUser) {
            success = true;
            console.log("User updated successfully:", updatedUser.email);
            res.json({ success, user: updatedUser });
        } else {
            console.log("User not found with ID:", userId);
            res.status(404).json({ success, error: "User not found" });
        }
    } catch (error) {
        console.error("Error updating user:", error.message);
        console.error("Full error:", error);
        res.status(500).json({ success, error: "Server Error: " + error.message });
    }
});

router.post('/getlocation', async (req, res) => {
    try {
        let lat = req.body.latlong.lat;
        let long = req.body.latlong.long;
        console.log(lat, long);
        let location = await axios
            .get("https://api.opencagedata.com/geocode/v1/json?q=" + lat + "+" + long + "&key=74c89b3be64946ac96d777d08b878d43")
            .then(async res => {
                let response = res.data.results[0].components;
                console.log(response);
                let { village, county, state_district, state, postcode } = response;
                return String(village + "," + county + "," + state_district + "," + state + "\n" + postcode);
            })
            .catch(error => {
                console.error(error);
            });
        res.send({ location });

    } catch (error) {
        console.error(error.message);
        res.send("Server Error");
    }
});

router.post('/foodData', async (req, res) => {
    try {
        res.send([global.foodData, global.foodCategory]);
    } catch (error) {
        console.error(error.message);
        res.send("Server Error");
    }
});

router.post('/orderData', async (req, res) => {
    let data = req.body.order_data;
    await data.splice(0, 0, { Order_date: req.body.order_date });
    console.log("1231242343242354", req.body.email);

    let eId = await Order.findOne({ 'email': req.body.email });
    console.log(eId);
    if (eId === null) {
        try {
            console.log(data);
            console.log("1231242343242354", req.body.email);
            await Order.create({
                email: req.body.email,
                order_data: [data]
            }).then(() => {
                res.json({ success: true });
            });
        } catch (error) {
            console.log(error.message);
            res.send("Server Error", error.message);
        }
    } else {
        try {
            await Order.findOneAndUpdate({ email: req.body.email },
                { $push: { order_data: data } }).then(() => {
                    res.json({ success: true });
                });
        } catch (error) {
            console.log(error.message);
            res.send("Server Error", error.message);
        }
    }
});

router.post('/myOrderData', async (req, res) => {
    try {
        console.log(req.body.email);
        let eId = await Order.findOne({ 'email': req.body.email });
        
        if (!eId) {
            return res.json({ 
                orderData: null, 
                hasOrders: false,
                message: "No orders found for this user"
            });
        }
        
        if (!eId.order_data || eId.order_data.length === 0) {
            return res.json({ 
                orderData: null, 
                hasOrders: false,
                message: "No orders found for this user"
            });
        }
        
        res.json({ 
            orderData: eId, 
            hasOrders: true,
            message: "Orders found successfully"
        });
    } catch (error) {
        console.error("Error fetching order data:", error);
        res.status(500).json({ 
            error: "Server error occurred while fetching order data",
            hasOrders: false
        });
    }
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post('/create-order', fetch, async (req, res) => {
    try {
        const { amount } = req.body;
        
        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ success: false, error: 'Failed to create payment order' });
    }
});

router.post('/verify-payment', fetch, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
});

router.get('/razorpay-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

module.exports = router;