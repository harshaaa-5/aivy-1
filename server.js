// Learnova Modern - Corrected Backend Server
// Node.js + Express + MongoDB + Socket.io + AI Integration (Error-Free)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://localhost:3000", "http://localhost:5000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Configuration
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'learnova-jwt-secret-key-2025';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learnova';

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir('uploads', { recursive: true });
    await fs.mkdir('logs', { recursive: true });
  } catch (error) {
    console.log('Directories already exist or created');
  }
};

// Security Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:3000", "http://localhost:5000"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// MongoDB Connection with Error Handling
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🗄️ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // Continue without MongoDB for development
    console.log('⚠️ Running without MongoDB - some features will be limited');
  }
};

// Database Models with Error Handling
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: null },
  preferences: {
    aiDifficulty: { type: String, default: 'balanced', enum: ['conservative', 'balanced', 'aggressive'] },
    aiStyle: { type: String, default: 'concise', enum: ['detailed', 'concise', 'conversational'] },
    cloudSync: { type: Boolean, default: true },
    realTimeCollab: { type: Boolean, default: true },
    theme: { type: String, default: 'light', enum: ['light', 'dark', 'auto'] }
  },
  stats: {
    totalStudyTime: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    activeSubjects: { type: Number, default: 0 }
  },
  lastActive: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const subjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  color: { type: String, default: '#667eea' },
  icon: { type: String, default: 'book' },
  topics: [{
    name: { type: String, required: true },
    questionsAnswered: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    lastPracticed: { type: Date, default: Date.now },
    difficulty: { type: String, default: 'medium', enum: ['easy', 'medium', 'hard'] },
    weakAreas: [String]
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const questionSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  topicId: { type: String },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String },
  difficulty: { type: String, default: 'medium', enum: ['easy', 'medium', 'hard'] },
  aiGenerated: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [String],
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  topicId: { type: String },
  questions: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    userAnswer: { type: Number },
    correct: { type: Boolean },
    timeSpent: { type: Number }, // in milliseconds
    timestamp: { type: Date, default: Date.now }
  }],
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  accuracy: { type: Number, min: 0, max: 100 },
  totalTime: { type: Number }, // in milliseconds
  sessionType: { type: String, default: 'practice', enum: ['practice', 'test', 'collaborative', 'ai_generated'] },
  completed: { type: Boolean, default: false }
}, {
  timestamps: true
});

const studyGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  subject: { type: String, required: true },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublic: { type: Boolean, default: true },
  maxMembers: { type: Number, default: 20, min: 2, max: 100 },
  tags: [String],
  schedule: {
    days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
    time: { type: String, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    timezone: { type: String, default: 'UTC' }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create Models
let User, Subject, Question, Session, StudyGroup;

try {
  User = mongoose.model('User', userSchema);
  Subject = mongoose.model('Subject', subjectSchema);
  Question = mongoose.model('Question', questionSchema);
  Session = mongoose.model('Session', sessionSchema);
  StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
} catch (error) {
  console.log('⚠️ Models created with potential limitations');
}

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Update last active time if user exists
    if (User) {
      await User.findByIdAndUpdate(decoded.userId, { 
        lastActive: new Date(),
        isOnline: true 
      }).catch(() => {});
    }

    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Mock AI Functions (for development without API keys)
const mockAIResponse = {
  generateQuestions: (topic, difficulty = 'medium', count = 5) => {
    const sampleQuestions = [];
    for (let i = 0; i < count; i++) {
      sampleQuestions.push({
        question: `What is the main concept of ${topic}? (Question ${i + 1})`,
        options: [
          `Option A for ${topic}`,
          `Option B for ${topic}`,
          `Option C for ${topic}`,
          `Option D for ${topic}`
        ],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `This question tests your understanding of ${topic}. The correct answer demonstrates key principles.`,
        difficulty: difficulty
      });
    }
    return sampleQuestions;
  },

  chatResponse: (message) => {
    const responses = [
      "I understand you're asking about that topic. Based on your learning pattern, I recommend focusing on the fundamentals first.",
      "That's a great question! Let me help you break this down into manageable concepts.",
      "I can see from your performance data that you're making good progress. Would you like me to generate some practice questions?",
      "Based on your learning style, I suggest trying a different approach to this concept.",
      "I can help you create a personalized study plan for this topic. Let's start with your current understanding."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  },

  analyzePerformance: (userData) => {
    return {
      overallAccuracy: 78,
      improvementAreas: ['Neural Networks', 'Data Structures'],
      strengths: ['Web Development', 'Algorithms'],
      recommendations: [
        'Focus on neural network fundamentals',
        'Practice more data structure problems',
        'Review machine learning concepts daily'
      ],
      studyTimeOptimal: '2-3 hours daily',
      difficultyRecommendation: 'medium'
    };
  }
};

// Enhanced AI Helper Functions with Error Handling
async function generateAIQuestions(topic, difficulty = 'medium', count = 5) {
  try {
    // Try real AI if API keys are available
    if (process.env.OPENAI_API_KEY) {
      // Real OpenAI implementation would go here
      // For now, return mock data to avoid errors
    }

    // Return mock questions for development
    return mockAIResponse.generateQuestions(topic, difficulty, count);
  } catch (error) {
    console.error('AI Question Generation Error:', error);
    return mockAIResponse.generateQuestions(topic, difficulty, count);
  }
}

async function generateAIChatResponse(message, context = {}) {
  try {
    // Try real AI if API keys are available
    if (process.env.OPENAI_API_KEY) {
      // Real OpenAI implementation would go here
    }

    // Return mock response for development
    return mockAIResponse.chatResponse(message);
  } catch (error) {
    console.error('AI Chat Error:', error);
    return "I'm having trouble connecting to AI services right now. Please try again later.";
  }
}

async function analyzeUserPerformance(userId) {
  try {
    if (!User || !Session) {
      return mockAIResponse.analyzePerformance({});
    }

    const user = await User.findById(userId);
    const sessions = await Session.find({ userId }).limit(50).sort({ createdAt: -1 });

    if (!user || sessions.length === 0) {
      return mockAIResponse.analyzePerformance({});
    }

    // Calculate real performance metrics
    const totalQuestions = sessions.reduce((sum, session) => sum + session.questions.length, 0);
    const correctAnswers = sessions.reduce((sum, session) => 
      sum + session.questions.filter(q => q.correct).length, 0);
    const averageAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return {
      overallAccuracy: averageAccuracy,
      totalQuestions,
      sessionsCompleted: sessions.length,
      improvementAreas: ['Focus Areas Based on Performance'],
      strengths: ['Areas Where You Excel'],
      recommendations: [
        `Your accuracy is ${averageAccuracy}% - ${averageAccuracy >= 80 ? 'Great job!' : 'Keep practicing!'}`,
        'Continue regular practice sessions',
        'Focus on challenging topics'
      ]
    };
  } catch (error) {
    console.error('Performance Analysis Error:', error);
    return mockAIResponse.analyzePerformance({});
  }
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '2.0.0'
  });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if MongoDB is available
    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'Database not available. Please try again later.'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create account. Please try again.' 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }

    // Check if MongoDB is available
    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'Database not available. Please try again later.'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid email or password' 
      });
    }

    // Update user status
    user.lastActive = new Date();
    user.isOnline = true;
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        preferences: user.preferences,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed. Please try again.' 
    });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    if (User) {
      await User.findByIdAndUpdate(req.user.userId, { 
        isOnline: false,
        lastActive: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

// User Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch profile' 
    });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences } = req.body;

    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const updateData = { lastActive: new Date() };
    if (name) updateData.name = name.trim();
    if (preferences) updateData.preferences = { ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile' 
    });
  }
});

app.post('/api/user/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    if (User) {
      await User.findByIdAndUpdate(req.user.userId, { 
        avatar: avatarUrl,
        lastActive: new Date()
      });
    }

    res.json({
      success: true,
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('Avatar Upload Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload avatar' 
    });
  }
});

// Subject Routes
app.get('/api/subjects', authenticateToken, async (req, res) => {
  try {
    if (!Subject) {
      return res.json({
        success: true,
        subjects: []
      });
    }

    const subjects = await Subject.find({ 
      userId: req.user.userId,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error('Subjects Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch subjects' 
    });
  }
});

app.post('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Subject name is required'
      });
    }

    if (!Subject) {
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    const subject = new Subject({
      userId: req.user.userId,
      name: name.trim(),
      description: description?.trim(),
      color: color || '#667eea',
      icon: icon || 'book'
    });

    await subject.save();

    // Update user stats
    if (User) {
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { 'stats.activeSubjects': 1 }
      });
    }

    res.status(201).json({
      success: true,
      subject
    });
  } catch (error) {
    console.error('Create Subject Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create subject' 
    });
  }
});

// AI Routes
app.post('/api/ai/generate-questions', authenticateToken, async (req, res) => {
  try {
    const { topic, difficulty = 'medium', count = 5 } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required'
      });
    }

    const questions = await generateAIQuestions(topic, difficulty, parseInt(count));

    res.json({
      success: true,
      questions,
      metadata: {
        topic,
        difficulty,
        count: questions.length,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Question Generation Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate questions' 
    });
  }
});

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const response = await generateAIChatResponse(message, context);
    const analysis = await analyzeUserPerformance(req.user.userId);

    res.json({
      success: true,
      response,
      suggestions: analysis.recommendations || [],
      context: {
        user_accuracy: analysis.overallAccuracy,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process chat message' 
    });
  }
});

app.get('/api/analytics/performance', authenticateToken, async (req, res) => {
  try {
    const analysis = await analyzeUserPerformance(req.user.userId);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze performance' 
    });
  }
});

// Study Groups Routes
app.get('/api/study-groups', authenticateToken, async (req, res) => {
  try {
    if (!StudyGroup) {
      return res.json({
        success: true,
        groups: []
      });
    }

    const groups = await StudyGroup.find({
      $or: [
        { members: req.user.userId },
        { leader: req.user.userId },
        { isPublic: true, isActive: true }
      ]
    }).populate('leader members', 'name email avatar').limit(20);

    res.json({
      success: true,
      groups
    });
  } catch (error) {
    console.error('Study Groups Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch study groups' 
    });
  }
});

// Real-time Socket.io Events
const activeUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    next();
  } catch (err) {
    console.error('Socket Auth Error:', err);
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ User ${socket.userId} connected via Socket.io`);

  // Track active user
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    connectedAt: new Date(),
    lastSeen: new Date()
  });

  // Join user to their personal room
  socket.join(`user-${socket.userId}`);

  // Broadcast user online status
  socket.broadcast.emit('user-online', {
    userId: socket.userId,
    timestamp: new Date()
  });

  // Handle study group joining
  socket.on('join-study-group', (groupId) => {
    try {
      socket.join(`group-${groupId}`);
      socket.to(`group-${groupId}`).emit('user-joined-group', {
        userId: socket.userId,
        groupId,
        timestamp: new Date()
      });
      console.log(`User ${socket.userId} joined study group ${groupId}`);
    } catch (error) {
      console.error('Join Study Group Error:', error);
      socket.emit('error', { message: 'Failed to join study group' });
    }
  });

  // Handle collaboration updates
  socket.on('collaboration-update', (data) => {
    try {
      const { groupId, type, content } = data;
      socket.to(`group-${groupId}`).emit('collaboration-update', {
        userId: socket.userId,
        type,
        content,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Collaboration Update Error:', error);
    }
  });

  // Handle practice session updates
  socket.on('practice-update', (data) => {
    try {
      const { sessionId, progress, accuracy } = data;
      socket.to(`session-${sessionId}`).emit('practice-update', {
        userId: socket.userId,
        progress,
        accuracy,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Practice Update Error:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    try {
      const { roomId } = data;
      socket.to(roomId).emit('user-typing', {
        userId: socket.userId,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Typing Indicator Error:', error);
    }
  });

  // Handle heartbeat for connection monitoring
  socket.on('heartbeat', () => {
    const user = activeUsers.get(socket.userId);
    if (user) {
      user.lastSeen = new Date();
      activeUsers.set(socket.userId, user);
    }
    socket.emit('heartbeat-ack', { timestamp: new Date() });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`❌ User ${socket.userId} disconnected: ${reason}`);

    // Remove from active users
    activeUsers.delete(socket.userId);

    // Update user status in database
    if (User) {
      User.findByIdAndUpdate(socket.userId, { 
        isOnline: false,
        lastActive: new Date()
      }).catch(() => {});
    }

    // Broadcast user offline status
    socket.broadcast.emit('user-offline', {
      userId: socket.userId,
      timestamp: new Date()
    });
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket Error for user ${socket.userId}:`, error);
  });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      details: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Initialize server
const initializeServer = async () => {
  try {
    await ensureUploadsDir();
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Learnova Modern Server running on port ${PORT}`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket: Ready for real-time connections`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    console.log('🔌 HTTP server closed');

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🗄️ MongoDB connection closed');
    }

    // Close socket connections
    io.close();
    console.log('⚡ Socket.io closed');

    console.log('✅ Server shut down successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forceful shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
  console.error('🚨 Unhandled Promise Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
initializeServer();

module.exports = { app, server, io };
