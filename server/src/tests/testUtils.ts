import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User';
import Repository from '../models/Repository';
import Analysis from '../models/Analysis';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

/**
 * Connect to the in-memory database
 */
export const connectTestDB = async () => {
  try {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    const mongooseOpts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
    
    await mongoose.connect(uri);
    
    return mongoServer;
  } catch (err) {
    console.error(err);
  }
};

/**
 * Drop database, close the connection and stop mongod
 */
export const closeTestDB = async (mongoServer: MongoMemoryServer) => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

/**
 * Remove all data from collections
 */
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

/**
 * Create a test user
 */
export const createTestUser = async () => {
  const user = new User({
    githubId: '12345',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    githubToken: 'github_token_123',
    isAdmin: false,
  });
  
  await user.save();
  return user;
};

/**
 * Create a test repository
 */
export const createTestRepository = async (userId: string) => {
  const repository = new Repository({
    owner: userId,
    name: 'test-repo',
    fullName: 'testuser/test-repo',
    description: 'Test repository for testing',
    githubId: '54321',
    isPrivate: false,
    language: 'TypeScript',
    url: 'https://github.com/testuser/test-repo',
    cloneUrl: 'https://github.com/testuser/test-repo.git',
    defaultBranch: 'main',
    stars: 10,
    forks: 5,
    size: 1000,
  });
  
  await repository.save();
  return repository;
};

/**
 * Create a test analysis
 */
export const createTestAnalysis = async (userId: string, repositoryId: string) => {
  const analysis = new Analysis({
    repository: repositoryId,
    user: userId,
    status: 'completed',
    branch: 'main',
    commit: 'abc123',
    startedAt: new Date(),
    completedAt: new Date(),
    summary: {
      quality: 'A',
      security: 'B',
      complexity: 'Medium',
      lines: 1000,
      files: 50,
      issues: 5,
      vulnerabilities: 2,
    },
  });
  
  await analysis.save();
  return analysis;
};

/**
 * Generate a JWT token for testing
 */
export const generateTestToken = (userId: string) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
};
