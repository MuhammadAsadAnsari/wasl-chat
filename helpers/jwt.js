const expressJwt = require('express-jwt');
const config = require('../config.json');
const fs=require('fs')

module.exports = jwt;

function jwt() {
    const { secret } = config;
    return expressJwt({ secret }).unless({
        path: [
            //public routes that don't require authentication                        
            '/chat',
            '/socket.io',
            '/location'
        ]
    });
}