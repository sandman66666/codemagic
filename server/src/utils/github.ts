import axios from 'axios';

/**
 * Utility functions for interacting with the GitHub API
 */

/**
 * Get repository details from GitHub
 * @param token GitHub access token
 * @param owner Repository owner
 * @param repo Repository name
 */
export const getRepository = async (token: string, owner: string, repo: string) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching repository from GitHub:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch repository from GitHub');
  }
};

/**
 * Get repository branches from GitHub
 * @param token GitHub access token
 * @param owner Repository owner
 * @param repo Repository name
 */
export const getRepositoryBranches = async (token: string, owner: string, repo: string) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching repository branches from GitHub:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch branches from GitHub');
  }
};

/**
 * Get commit details from GitHub
 * @param token GitHub access token
 * @param owner Repository owner
 * @param repo Repository name
 * @param sha Commit SHA
 */
export const getCommit = async (token: string, owner: string, repo: string, sha: string) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching commit from GitHub:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch commit from GitHub');
  }
};

/**
 * Get repository contents from GitHub
 * @param token GitHub access token
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path to the file or directory
 * @param ref Branch, tag, or commit SHA
 */
export const getRepositoryContents = async (
  token: string,
  owner: string,
  repo: string,
  path: string = '',
  ref: string = 'main'
) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching repository contents from GitHub:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch contents from GitHub');
  }
};

/**
 * Get file content from GitHub
 * @param token GitHub access token
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path to the file
 * @param ref Branch, tag, or commit SHA
 */
export const getFileContent = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string = 'main'
) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    
    // GitHub API returns base64 encoded content
    if (response.data.encoding === 'base64') {
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }
    
    return response.data.content;
  } catch (error: any) {
    console.error('Error fetching file content from GitHub:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch file content from GitHub');
  }
};
