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
    body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
    body('location').optional(),
    body('mobile')
        .optional()
        .custom((value) => {
            if (value && value.trim() !== '') {
                if (!/^\d+$/.test(value)) {
                    throw new Error('Mobile number must contain only numbers');
                }
                if (value.length !== 10) {
                    throw new Error('Mobile number must be exactly 10 digits');
                }
            }
            return true;
        })
];

module.exports = {
    createUserValidation,
    loginValidation,
    updateUserValidation
};
