const express = require('express');
const router = express.Router();
const fetch = require('../middleware/fetch-details');

const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');
const foodController = require('../controllers/foodController');
const paymentController = require('../controllers/paymentController');
const locationController = require('../controllers/locationController');

const { 
    createUserValidation, 
    loginValidation, 
    updateUserValidation 
} = require('../validators/authValidators');

router.get('/test', authController.testServer);

router.post('/createuser', createUserValidation, authController.createUser);

router.post('/login', loginValidation, authController.loginUser);

router.post('/google-auth', authController.googleAuth);

router.post('/getuser', fetch, authController.getUser);

router.put('/updateuser', fetch, updateUserValidation, authController.updateUser);

router.post('/getlocation', locationController.getLocation);

router.post('/foodData', foodController.getFoodData);

router.post('/orderData', orderController.createOrder);

router.post('/myOrderData', orderController.getMyOrders);

router.post('/create-order', fetch, paymentController.createPaymentOrder);

router.post('/verify-payment', fetch, paymentController.verifyPayment);

router.get('/razorpay-key', paymentController.getRazorpayKey);

module.exports = router;
