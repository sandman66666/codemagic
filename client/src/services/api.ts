import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '/api',
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage on every request
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Repository API calls
export const repositoryApi = {
  getUserRepositories: () => api.get('/repositories'),
  getGitHubRepositories: () => api.get('/repositories/github'),
  syncRepositories: (force = false) => api.post('/repositories/sync', { force }),
  getRepositoryById: (id: string) => api.get(`/repositories/${id}`),
  getRepositoryBranches: (id: string) => api.get(`/repositories/${id}/branches`),
  // Repository ingest related methods
  checkRepositoryProcessed: (id: string) => api.get(`/analysis/repository/${id}/processed`),
  getRepositoryIngestData: (id: string, contentType?: string) => 
    api.get(`/analysis/repository/${id}/ingest/${contentType || ''}`),
  processRepositoryWithIngest: (id: string) => 
    api.post(`/analysis/repository/${id}/ingest`),
};

// Analysis API calls
export const analysisApi = {
  getUserAnalyses: () => api.get('/analyses'),
  startAnalysis: (repositoryId: string, branch: string, filters: any) => 
    api.post('/analyses', { repositoryId, branch, filters }),
  getAnalysisById: (id: string) => api.get(`/analyses/${id}`),
  getAnalysisStatus: (id: string) => api.get(`/analyses/${id}/status`),
  deleteAnalysis: (id: string) => api.delete(`/analyses/${id}`),
  compareAnalyses: (analysisIds: string[]) => api.post('/analyses/compare', { analysisIds }),
};

// AI features API calls
export const aiApi = {
  generateAiInsights: (repositoryUrl: string) => 
    api.post('/ai/insights', { repositoryUrl }),
  extractCoreElements: (repositoryUrl: string) => 
    api.post('/ai/core-elements', { repositoryUrl }),
  generateIosApp: (repositoryUrl: string) => 
    api.post('/ai/ios-app', { repositoryUrl }),
};

// User API calls
export const userApi = {
  getCurrentUser: () => api.get('/auth/me'),
  getUserProfile: () => api.get('/users/profile'),
  updateProfile: (userData: any) => api.put('/users/profile', userData),
  updateUserProfile: (userData: any) => api.put('/users/profile', userData),
  updateUserSettings: (settings: any) => api.put('/users/settings', settings),
};

export default api;
