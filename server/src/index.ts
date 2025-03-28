import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import passport from 'passport';
import { connectDB } from './config/db';
import { configurePassport } from './config/passport';
import authRoutes from './routes/auth';
import repositoryRoutes from './routes/repositories';
import analysisRoutes from './routes/analysis';
import userRoutes from './routes/users';
import aiRoutes from './routes/ai';
import testDbRoutes from './routes/testDb';

// Load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Configure Passport.js for authentication
configurePassport(passport);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/analysis', analysisRoutes); // Add alias route to match frontend URL
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/test-db', testDbRoutes); // Add the test database route

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong!',
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
