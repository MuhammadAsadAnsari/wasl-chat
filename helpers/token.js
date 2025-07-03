const Joi = require('@hapi/joi');
const myCustomJoi = Joi.extend(require('joi-phone-number'));


const upgradeTokenSchema = Joi.object({
    email: Joi.string()
              .email()
              .required(),
    
    profile: Joi.string()
                .alphanum()
                .required(),
    
    iat : Joi.any()             
             .required()
});


//middleware to check upgraded token
function isUpgradedToken(req, res, next) {

    const {error, value} = upgradeTokenSchema.validate(req.user);

    if (!error) {
        next();
    }
    else {
        res.status(401).json({error: "This operation requires elevated permissions."});
    }
}


module.exports = {
	isUpgradedToken
}