'use strict';
module.exports = function(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.status(401);
        res.send('You are not logged in');
    }
}