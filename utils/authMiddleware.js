module.exports.isAuth = (req, res, next) => {
    if(req.isAuthenticated()){
        next()
    } else {
        return res.status(401).json({"msg": "you are not authorized"})
    }
}

module.exports.isVip = (req, res, next) => {
    if(req.isAuthenticated() && req.user.membership !== 'pleb'){
        next()
    } else {
        return res.status(401).json({"msg": "you are not authorized, vip only"})
    }
}

module.exports.isAdmin = (req, res, next) => {
    if(req.isAuthenticated() && req.user.isadmin){
        next()
    } else {
        return res.status(401).json({"msg": "you are not authorized, admin only"})
    }
}