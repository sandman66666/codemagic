/**
 * Type definitions for the CodeInsight application
 */

// Repository response type
export interface RepositoryResponse {
  id: string;
  name: string;
  fullName: string;
  description: string;
  githubId: string;
  isPrivate: boolean;
  language: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  stars: number;
  forks: number;
  size: number;
  lastAnalyzedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User response type
export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  isAdmin: boolean;
  repositories?: number;
  analyses?: number;
  createdAt?: Date;
  updatedAt?: Date;
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

// Analysis response type
export interface AnalysisResponse {
  id: string;
  repository: {
    id: string;
    name: string;
    fullName: string;
    githubId: string;
    url: string;
  };
  user: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  branch: string;
  commit: string;
  startedAt: Date;
  completedAt?: Date;
  summary?: AnalysisSummary;
  vulnerabilities?: Vulnerability[];
  codeQuality?: CodeQualityIssue[];
  keyFiles?: KeyFile[];
  keyInsights?: string[];
  documentation?: Documentation;
  createdAt: Date;
  updatedAt: Date;
}

// GitHub repository type
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  language: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
}

// GitHub branch type
export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

// Analysis filters type
export interface AnalysisFilters {
  includeNodeModules?: boolean;
  includeTests?: boolean;
  includeDocumentation?: boolean;
  maxFileSize?: string; // in MB
  languages?: string[];
  excludePatterns?: string[];
}
