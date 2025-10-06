const getFoodData = async (req, res) => {
    try {
        res.send([global.foodData, global.foodCategory]);
    } catch (error) {
        console.error(error.message);
        res.send("Server Error");
    }
};

module.exports = {
    getFoodData
};

