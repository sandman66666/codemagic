/**
 * Shared types for the CodeInsight application
 * These types are used by both the client and server
 */

// User type for authentication responses
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  isAdmin: boolean;
}

// Repository type for API responses
export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  isPrivate: boolean;
  language: string;
  url: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  size: number;
  lastAnalyzedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Analysis summary type
export interface AnalysisSummary {
  quality: string;
  security: string;
  complexity: string;
  lines: number;
  files: number;
  issues: number;
  vulnerabilities: number;
}

// Vulnerability type
export interface Vulnerability {
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  location: string;
  line: number;
}

// Code quality issue type
export interface CodeQualityIssue {
  type: 'Improvement' | 'Warning' | 'Error';
  title: string;
  description: string;
  location: string;
  line: number;
}

// Key file type
export interface KeyFile {
  path: string;
  description: string;
  size: string;
}

// Documentation type
export interface Documentation {
  overview: string;
  architecture: string;
  setup: string;
  deployment: string;
}

// Analysis type for API responses
export interface Analysis {
  id: string;
  repository: {
    id: string;
    name: string;
    fullName: string;
    url: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  branch: string;
  commit: string;
  startedAt: string;
  completedAt?: string;
  summary?: AnalysisSummary;
  vulnerabilities?: Vulnerability[];
  codeQuality?: CodeQualityIssue[];
  keyFiles?: KeyFile[];
  keyInsights?: string[];
  documentation?: Documentation;
  createdAt: string;
  updatedAt: string;
}

// API error response
export interface ErrorResponse {
  message: string;
  statusCode?: number;
}
