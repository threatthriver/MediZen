const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to access this resource'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'User not found'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: 'Please log in again'
        });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: 'Admin access required'
        });
    }
};

exports.isVerified = (req, res, next) => {
    if (req.user && req.user.isVerified) {
        next();
    } else {
        res.status(403).json({
            success: false,
            error: 'Unverified Account',
            message: 'Please verify your account to access this feature'
        });
    }
};
