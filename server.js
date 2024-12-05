const express = require('express');
const path = require('path');
const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { isAuthenticated } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected')).catch(err => console.error('MongoDB connection error:', err));

// Initialize Cerebras with API key
const cerebras = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY
});

// Rate limiting configuration
const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 50, // limit each IP to 50 requests per windowMs
    message: {
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again in an hour',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Chat-specific rate limiter
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // limit each IP to 5 requests per minute
    message: {
        success: false,
        error: 'Chat rate limit exceeded',
        message: 'Please wait a moment before sending another message',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes

// Queue for managing API requests
const requestQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;
    
    isProcessing = true;
    const { req, res, message } = requestQueue.shift();
    
    try {
        const response = await cerebras.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a medical AI assistant helping doctors analyze patient cases. Provide detailed medical insights, suggest potential diagnoses, and recommend treatment options based on the information provided. Always maintain a professional tone and use medical terminology appropriately."
                },
                { role: "user", content: message }
            ],
            model: "llama3.1-70b",
            max_tokens: 512,
            temperature: 0.7,
            top_p: 0.9
        });

        const aiResponse = response.choices[0]?.message?.content;
        
        if (!aiResponse) {
            throw new Error('No response generated from AI service');
        }

        res.json({ 
            success: true, 
            response: aiResponse 
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        
        if (error.message?.includes('rate limit')) {
            // Add request back to queue if it's a rate limit error
            requestQueue.unshift({ req, res, message });
            setTimeout(processQueue, 60 * 1000); // Retry after 1 minute
            return;
        }

        res.status(500).json({ 
            success: false, 
            error: 'Internal Server Error', 
            message: error.message 
        });
    } finally {
        isProcessing = false;
        processQueue(); // Continue processing the queue
    }
}

// Start processing the queue
processQueue();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Registration route
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, specialty, licenseNumber } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                success: false,
                error: 'User already exists',
                message: 'A user with this email already exists'
            });
        }

        const user = new User({
            name,
            email,
            password,
            role,
            specialty,
            licenseNumber
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration Error',
            message: 'An error occurred during registration'
        });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.json({
            success: true,
            token,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login Error',
            message: 'An error occurred during login'
        });
    }
});

// Chat API endpoint with rate limiting and queuing
app.post('/api/chat', chatLimiter, async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Validation Error',
            message: 'Message is required' 
        });
    }

    if (typeof message !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Message must be a string'
        });
    }

    if (message.length > 1000) {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Message is too long. Please keep it under 1000 characters.'
        });
    }

    // Add request to queue
    requestQueue.push({ req, res, message });
    processQueue();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.name || 'Error',
        message: err.message || 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
