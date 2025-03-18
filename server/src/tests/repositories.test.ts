import request from 'supertest';
import app from '../index';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  connectTestDB,
  closeTestDB,
  clearDatabase,
  createTestUser,
  createTestRepository,
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

describe('Repositories API', () => {
  describe('GET /api/repositories', () => {
    it('should return repositories for authenticated user', async () => {
      // Create a test user and repository
      const user = await createTestUser();
      await createTestRepository(user._id.toString());
      
      // Generate a valid token
      const token = generateTestToken(user._id.toString());
      
      // Make the request with the token
      const response = await request(app)
        .get('/api/repositories')
        .set('Authorization', `Bearer ${token}`);
      
      // Expect a successful response
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('name', 'test-repo');
    });
    
    it('should return 401 when not authenticated', async () => {
      // Make the request without a token
      const response = await request(app).get('/api/repositories');
      
      // Expect an unauthorized response
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/repositories/:id', () => {
    it('should return a repository by ID for authenticated user', async () => {
      // Create a test user and repository
      const user = await createTestUser();
      const repository = await createTestRepository(user._id.toString());
      
      // Generate a valid token
      const token = generateTestToken(user._id.toString());
      
      // Make the request with the token
      const response = await request(app)
        .get(`/api/repositories/${repository._id}`)
        .set('Authorization', `Bearer ${token}`);
      
      // Expect a successful response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'test-repo');
      expect(response.body).toHaveProperty('fullName', 'testuser/test-repo');
    });
    
    it('should return 404 for non-existent repository', async () => {
      // Create a test user
      const user = await createTestUser();
      
      // Generate a valid token
      const token = generateTestToken(user._id.toString());
      
      // Make the request with the token and a non-existent ID
      const response = await request(app)
        .get('/api/repositories/5f43a7b5c1b5b52bfc1f5d3a')
        .set('Authorization', `Bearer ${token}`);
      
      // Expect a not found response
      expect(response.status).toBe(404);
    });
  });
});
