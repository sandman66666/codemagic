import request from 'supertest';
import app from '../index';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  connectTestDB,
  closeTestDB,
  clearDatabase,
  createTestUser,
  generateTestToken,
} from './testUtils';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await connectTestDB() as MongoMemoryServer;
});

afterAll(async () => {
  await closeTestDB(mongoServer);
});

beforeEach(async () => {
  await clearDatabase();
});

describe('Auth API', () => {
  describe('GET /api/auth/me', () => {
    it('should return user data when authenticated', async () => {
      // Create a test user
      const user = await createTestUser();
      
      // Generate a valid token
      const token = generateTestToken(user._id.toString());
      
      // Make the request with the token
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      
      // Expect a successful response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('displayName', 'Test User');
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });
    
    it('should return 401 when not authenticated', async () => {
      // Make the request without a token
      const response = await request(app).get('/api/auth/me');
      
      // Expect an unauthorized response
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should return success message', async () => {
      // Make the logout request
      const response = await request(app).post('/api/auth/logout');
      
      // Expect a successful response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });
});
