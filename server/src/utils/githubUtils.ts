import axios from 'axios';
import { logger } from './logger';

/**
 * Extract GitHub owner and repo name from repository URL
 */
export const extractGitHubInfo = (url: string): { owner: string; repo: string } | null => {
  // Handle different GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/\.]+)(\.git)?/,  // https://github.com/owner/repo.git or https://github.com/owner/repo
    /github\.com:([^\/]+)\/([^\/\.]+)(\.git)?/    // git@github.com:owner/repo.git
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
  }
  
  return null;
};

/**
 * Fetch GitHub repository metadata
 */
export const fetchGitHubRepoMetadata = async (
  repositoryUrl: string, 
  token?: string
): Promise<any> => {
  try {
    // Extract owner and repo from URL
    const repoInfo = extractGitHubInfo(repositoryUrl);
    if (!repoInfo) {
      logger.error(`Failed to extract owner/repo from URL: ${repositoryUrl}`);
      return null;
    }
    
    const { owner, repo } = repoInfo;
    
    // Set up headers with token if provided
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    // Fetch repository data
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );
    
    // Fetch latest commit data
    const commitsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      { headers }
    );
    
    const latestCommit = commitsResponse.data[0];
    
    // Format the metadata
    const metadata = {
      repositoryId: repoResponse.data.id.toString(),
      ownerName: owner,
      repoName: repo,
      fullName: repoResponse.data.full_name,
      defaultBranch: repoResponse.data.default_branch,
      commitHash: latestCommit.sha,
      commitMessage: latestCommit.commit.message,
      commitDate: new Date(latestCommit.commit.committer.date),
      stars: repoResponse.data.stargazers_count,
      forks: repoResponse.data.forks_count,
      issues: repoResponse.data.open_issues_count,
      lastUpdated: new Date(repoResponse.data.updated_at),
      isPrivate: repoResponse.data.private,
      description: repoResponse.data.description
    };
    
    return metadata;
  } catch (error) {
    logger.error(`Error fetching GitHub metadata: ${error.message}`);
    // Return partial metadata if we can extract it from the URL
    const repoInfo = extractGitHubInfo(repositoryUrl);
    if (repoInfo) {
      return {
        ownerName: repoInfo.owner,
        repoName: repoInfo.repo,
        fullName: `${repoInfo.owner}/${repoInfo.repo}`
      };
    }
    return null;
  }
};
