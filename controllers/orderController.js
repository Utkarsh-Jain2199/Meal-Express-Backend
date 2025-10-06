const Order = require('../models/orders');

const createOrder = async (req, res) => {
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
};

const getMyOrders = async (req, res) => {
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
};

module.exports = {
    createOrder,
    getMyOrders
};

