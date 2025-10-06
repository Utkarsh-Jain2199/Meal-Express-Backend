const { body } = require('express-validator');

const createUserValidation = [
    body('email').isEmail(),
    body('password').isLength({ min: 5 }),
    body('name').isLength({ min: 3 })
];

const loginValidation = [
    body('email', "Enter a Valid Email").isEmail(),
    body('password', "Password cannot be blank").exists()
];

const updateUserValidation = [
    body('name').isLength({ min: 3 }),
    body('location').optional(),
    body('mobile').optional()
];

module.exports = {
    createUserValidation,
    loginValidation,
    updateUserValidation
};

