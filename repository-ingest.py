#!/usr/bin/env python3
import gitingest
import os
import sys
import argparse
import json
import logging
import datetime
from typing import Dict, Tuple, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('repository_ingest')

class RepositoryIngest:
    """
    A class to handle repository ingestion using gitingest.
    This processes repositories for analysis by extracting relevant code and structure.
    """
    
    def __init__(self, temp_dir: str = None):
        """
        Initialize the repository ingestion service.
        
        Args:
            temp_dir: The temporary directory where repositories are cloned
        """
        if temp_dir:
            self.temp_dir = temp_dir
        else:
            # Use default temp directory for CodeInsight
            self.temp_dir = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp', 'codeinsight')
            
        # Create temp directory if it doesn't exist
        os.makedirs(self.temp_dir, exist_ok=True)
        logger.info(f"Using temporary directory: {self.temp_dir}")

    def get_repo_dirs(self) -> list:
        """
        Get list of repositories in the temporary directory.
        
        Returns:
            List of repository directory names
        """
        try:
            dirs = [d for d in os.listdir(self.temp_dir) 
                   if os.path.isdir(os.path.join(self.temp_dir, d))]
            return dirs
        except Exception as e:
            logger.error(f"Error listing repository directories: {e}")
            return []

    def process_repository(self, 
                          repo_path: str,
                          output_dir: Optional[str] = None,
                          repo_id: Optional[str] = None) -> Dict[str, str]:
        """
        Process a repository using gitingest.
        
        Args:
            repo_path: Path to the repository directory or a Git URL
            output_dir: Directory to save output files (defaults to temp_dir)
            repo_id: Repository identifier for output naming
            
        Returns:
            Dictionary with paths to output files and processed content
        """
        try:
            logger.info(f"Processing repository: {repo_path}")
            
            # Default output directory to temp_dir if not specified
            if not output_dir:
                output_dir = self.temp_dir
            
            # Create identifier for files if not provided
            if not repo_id:
                # Extract from repo_path - either directory name or last part of URL
                if os.path.isdir(repo_path):
                    repo_id = os.path.basename(os.path.normpath(repo_path))
                else:
                    # Assume it's a URL - get last part
                    repo_id = repo_path.split('/')[-1]
                    if repo_id.endswith('.git'):
                        repo_id = repo_id[:-4]
                        
            # Process with gitingest - it handles file filtering internally
            summary, tree, content = gitingest.ingest(repo_path)
            
            # Create output filenames with repo identifier
            summary_file = os.path.join(output_dir, f"{repo_id}_summary.txt")
            tree_file = os.path.join(output_dir, f"{repo_id}_tree.txt")
            content_file = os.path.join(output_dir, f"{repo_id}_content.txt")
            metadata_file = os.path.join(output_dir, f"{repo_id}_metadata.json")
            
            # Write output files
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary)
            
            with open(tree_file, 'w', encoding='utf-8') as f:
                f.write(tree)
                
            with open(content_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Create metadata with file paths and timestamps
            metadata = {
                "repository_id": repo_id,
                "processed_at": str(datetime.datetime.now()),
                "files": {
                    "summary": summary_file,
                    "tree": tree_file,
                    "content": content_file,
                },
                "stats": {
                    "summary_length": len(summary),
                    "tree_length": len(tree),
                    "content_length": len(content),
                }
            }
            
            # Write metadata
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Repository processing complete. Output saved to {output_dir}")
            
            return {
                "summary_file": summary_file,
                "tree_file": tree_file,
                "content_file": content_file,
                "metadata_file": metadata_file,
                "summary": summary,
                "tree": tree,
                "content": content
            }
            
        except Exception as e:
            logger.error(f"Error processing repository: {e}")
            raise

    def process_latest_repo(self, output_dir: Optional[str] = None) -> Dict[str, str]:
        """
        Process the most recently added repository in the temp directory.
        
        Args:
            output_dir: Directory to save output files (defaults to temp_dir)
            
        Returns:
            Dictionary with paths to output files and processed content
        """
        try:
            repo_dirs = self.get_repo_dirs()
            
            if not repo_dirs:
                raise ValueError("No repository directories found in the temporary directory")
                
            # Sort by creation time (newest first)
            repo_dirs.sort(key=lambda d: os.path.getctime(os.path.join(self.temp_dir, d)), reverse=True)
            latest_repo = repo_dirs[0]
            
            repo_path = os.path.join(self.temp_dir, latest_repo)
            logger.info(f"Processing latest repository: {repo_path}")
            
            return self.process_repository(repo_path, output_dir, latest_repo)
            
        except Exception as e:
            logger.error(f"Error processing latest repository: {e}")
            raise


def main():
    """
    Main function to run from command line.
    """
    parser = argparse.ArgumentParser(
        description='Process Git repositories for LLM analysis using gitingest'
    )
    parser.add_argument(
        '--repo',
        help='Repository path or URL to process'
    )
    parser.add_argument(
        '--latest',
        action='store_true',
        help='Process the latest repository in the temp directory'
    )
    parser.add_argument(
        '--temp-dir',
        help='Temporary directory for repository processing'
    )
    parser.add_argument(
        '--output-dir',
        help='Directory to save the processed output'
    )
    parser.add_argument(
        '--repo-id',
        help='Repository identifier for output naming'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Set log level based on verbose flag
    if args.verbose:
        logger.setLevel(logging.DEBUG)
        
    try:
        # Initialize processor
        processor = RepositoryIngest(temp_dir=args.temp_dir)
        
        # Process based on arguments
        if args.repo:
            result = processor.process_repository(
                args.repo,
                output_dir=args.output_dir,
                repo_id=args.repo_id
            )
            print(f"Repository processed. Files saved to:")
            for key, path in result.items():
                if key.endswith('_file'):
                    print(f"  {key}: {path}")
        elif args.latest:
            result = processor.process_latest_repo(output_dir=args.output_dir)
            print(f"Latest repository processed. Files saved to:")
            for key, path in result.items():
                if key.endswith('_file'):
                    print(f"  {key}: {path}")
        else:
            # Default to showing available repositories
            repo_dirs = processor.get_repo_dirs()
            if repo_dirs:
                print("Available repositories:")
                for i, repo in enumerate(repo_dirs):
                    repo_path = os.path.join(processor.temp_dir, repo)
                    print(f"{i+1}. {repo} - {repo_path}")
                print("\nRun with --repo <path> or --latest to process a repository")
            else:
                print("No repositories found in the temporary directory")
                
    except Exception as e:
        logger.error(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()