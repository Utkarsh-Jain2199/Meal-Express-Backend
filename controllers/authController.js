const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { validationResult } = require('express-validator');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

if (!jwtSecret) {
    console.error("JWT_SECRET is not defined in environment variables!");
    process.exit(1);
}

const testServer = (req, res) => {
    res.json({
        success: true,
        message: "Server is working",
        timestamp: new Date().toISOString(),
        userModel: !!User,
        jwtSecret: !!jwtSecret,
        jwtSecretLength: jwtSecret ? jwtSecret.length : 0
    });
};

const createUser = async (req, res) => {
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
};

const loginUser = async (req, res) => {
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
};

const googleAuth = async (req, res) => {
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
};

const getUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");
        res.send(user);
    } catch (error) {
        console.error(error.message);
        res.send("Server Error");
    }
};

const updateUser = async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ 
            success, 
            errors: errors.array(), 
            error: errors.array()[0].msg || "Validation failed" 
        });
    }

    try {
        const userId = req.user.id;
        const { name, location, mobile } = req.body;
        
        if (mobile && mobile.trim() !== '') {
            if (!/^\d{10}$/.test(mobile.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Mobile number must be exactly 10 digits and contain only numbers" 
                });
            }
        }
        
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
};

module.exports = { testServer, createUser, loginUser, googleAuth, getUser, updateUser };
