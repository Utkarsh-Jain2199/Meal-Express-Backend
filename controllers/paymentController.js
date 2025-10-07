const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createPaymentOrder = async (req, res) => {
    try {
        const { cartItems } = req.body;
        
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cart items are required' 
            });
        }
        
        let totalAmount = 0;
        cartItems.forEach(item => {
            if (item && item.price && item.qty) {
                totalAmount += item.price * item.qty;
            }
        });
        
        const options = {
            amount: totalAmount * 100,
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create payment order' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cartItems, deliveryAddress, orderName, orderMobile } = req.body;
        
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Cart items are required for payment verification' 
                });
            }
            
            if (!orderName || orderName.trim() === '') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Order name is required' 
                });
            }
            
            if (!orderMobile || orderMobile.trim() === '') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Mobile number is required' 
                });
            }
            
            if (!/^\d{10}$/.test(orderMobile.trim())) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Mobile number must be exactly 10 digits and contain only numbers' 
                });
            }
            
            let totalAmount = 0;
            cartItems.forEach(item => {
                if (item && item.price && item.qty) {
                    totalAmount += item.price * item.qty;
                }
            });
            
            const orderData = {
                order_date: new Date().toLocaleDateString(),
                order_name: orderName,
                order_mobile: orderMobile,
                delivery_address: deliveryAddress,
                total_amount: totalAmount,
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id,
                items: cartItems
            };
            
            res.json({ 
                success: true, 
                message: 'Payment verified successfully',
                orderData: orderData
            });
        } else {
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
};

const getRazorpayKey = (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    getRazorpayKey
};
