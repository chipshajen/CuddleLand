const { body } = require('express-validator')
require('dotenv').config()

const lengthMessage = (field, min, max) => {
    return `${field} must be between ${min} and ${max} characters long`
}

const signupValidators = [
    body("username").trim()
    .isLength({ min: 3, max: 30 })
    .withMessage(lengthMessage('First name', 3, 30))
    .isAlphanumeric().withMessage('Username must contain letters and numbers only'),

    body("first").trim()
    .isLength({ min: 2, max: 30 }).withMessage(lengthMessage('First name', 3, 30))
    .isAlpha().withMessage('First name must contain letters only'),

    body("last").trim()
    .isLength({ min: 2, max: 30 })
    .withMessage(lengthMessage('First name', 3, 30))
    .isAlpha().withMessage('Last name must contain letters only'),

    body("password")
    .isLength({ min: 5 }).withMessage("Password must be atleast 5 characters long"),

    body("confirm").custom((value, { req }) => {
        return req.body.password === value
    })
    .withMessage('Your confirm message did not match')
]

const vipValidators = [
    body("vip").custom((value) => {
        return process.env.VIP === value
    })
    .withMessage('Wrong code!')
]

module.exports = { signupValidators, vipValidators }