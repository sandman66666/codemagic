import { useState, useEffect, useCallback, useRef } from 'react';
import { useDisclosure } from '@chakra-ui/react';

// Interface for the hook input
export interface RepositoryAnalysisInput {
  content?: string;
  summary?: string;
  fileTree?: string;
}

// Interface for the hook result
export interface UseRepositoryAnalysisResult {
  // File data
  availableFiles: string[];
  selectedFiles: string[];
  fileTree: any;
  
  // File selection handlers
  toggleFileSelection: (fileName: string) => void;
  toggleSelectAll: () => void;
  toggleDirectoryFiles: (dirFiles: string[], isSelected: boolean) => void;
  getAllFilesInDir: (dir: any) => string[];
  
  // Content filtering
  getFilteredContent: () => string;
  
  // UI state
  isFileSelectOpen: boolean;
  onFileSelectOpen: () => void;
  onFileSelectClose: () => void;
}

/**
 * Custom hook for repository analysis that handles file selection, parsing, and content filtering
 */
export function useRepositoryAnalysis(
  repositoryData: RepositoryAnalysisInput
): UseRepositoryAnalysisResult {
  // File selection state for content display filtering
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [fileTree, setFileTree] = useState<any>({});
  const { isOpen: isFileSelectOpen, onOpen: onFileSelectOpen, onClose: onFileSelectClose } = useDisclosure();
  
  // Refs to track previous content to avoid unnecessary updates
  const prevContentRef = useRef<string | undefined>(undefined);

  // Parse content to extract available files when data changes
  useEffect(() => {
    // Only process if content has actually changed 
    if (repositoryData?.content && repositoryData.content !== prevContentRef.current) {
      prevContentRef.current = repositoryData.content;
      
      const files = parseFilesFromContent(repositoryData.content);
      setAvailableFiles(files);
      setSelectedFiles(files); // Initially select all files
      
      // Build file tree structure
      const tree = buildFileTree(files);
      setFileTree(tree);
    }
  }, [repositoryData]);
  
  // Build a tree structure from file paths
  const buildFileTree = useCallback((files: string[]) => {
    const tree: any = {};
    
    files.forEach(filePath => {
      // Split path into directories and filename
      const parts = filePath.split(/[/\\]/);
      let currentLevel = tree;
      
      // Build the tree structure
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // If it's the filename (last part)
        if (i === parts.length - 1) {
          if (!currentLevel.files) {
            currentLevel.files = [];
          }
          currentLevel.files.push({
            name: part,
            path: filePath
          });
        } else {
          // It's a directory
          if (!currentLevel.dirs) {
            currentLevel.dirs = {};
          }
          if (!currentLevel.dirs[part]) {
            currentLevel.dirs[part] = {};
          }
          currentLevel = currentLevel.dirs[part];
        }
      }
    });
    
    return tree;
  }, []);
  
  // Parse ingested content to extract individual files using the exact boundary format
  const parseFilesFromContent = useCallback((content: string): string[] => {
    const files: string[] = [];
    console.log('Parsing repository content using exact boundary format...');
    
    // From the debug output, we can see the actual format is:
    // ================================================
    // File: filename
    // ================================================
    
    // Extract using a regex that exactly matches this pattern
    const fileHeaderRegex = /={50,}\n+File:\s*([^\n]+)\n+={50,}/g;
    let match;
    
    while ((match = fileHeaderRegex.exec(content)) !== null) {
      const filename = match[1].trim();
      if (filename && !files.includes(filename)) {
        console.log(`Detected file: "${filename}"`);
        files.push(filename);
      }
    }
    
    // If we didn't find any files with the regex, try a line-by-line approach
    if (files.length === 0) {
      console.log("No files found with regex, trying line-by-line approach...");
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for lines that start with "File: "
        if (line.startsWith('File:')) {
          const filename = line.substring(5).trim();
          if (filename && !files.includes(filename)) {
            console.log(`Line-by-line detected file: "${filename}"`);
            files.push(filename);
          }
        }
      }
    }
    
    console.log(`Total ${files.length} files detected:`, files);
    return files;
  }, []);
  
  // Handle file selection toggle - using useCallback to prevent stale closures
  const toggleFileSelection = useCallback((fileName: string) => {
    console.log(`Toggling file: ${fileName}`);
    setSelectedFiles(prev => {
      // Create a copy of the array to ensure state update triggers properly
      if (prev.includes(fileName)) {
        console.log(`Removing file: ${fileName}`);
        const newFiles = prev.filter(f => f !== fileName);
        console.log("New selected files:", newFiles);
        return newFiles;
      } else {
        console.log(`Adding file: ${fileName}`);
        const newFiles = [...prev, fileName];
        console.log("New selected files:", newFiles);
        return newFiles;
      }
    });
  }, []);
  
  // Toggle select all files
  const toggleSelectAll = useCallback(() => {
    console.log("Toggling select all");
    setSelectedFiles(prev => {
      if (prev.length === availableFiles.length) {
        console.log("Deselecting all files");
        setSelectAll(false);
        return [];
      } else {
        console.log("Selecting all files");
        setSelectAll(true);
        return [...availableFiles];
      }
    });
  }, [availableFiles]);
  
  // Toggle all files in a directory
  const toggleDirectoryFiles = useCallback((dirFiles: string[], isSelected: boolean) => {
    console.log(`Toggling directory files, currently selected: ${isSelected}`);
    if (isSelected) {
      // Remove all these files
      setSelectedFiles(prev => {
        const newFiles = prev.filter(f => !dirFiles.includes(f));
        console.log("New selected files:", newFiles);
        return newFiles;
      });
    } else {
      // Add files that aren't already selected
      setSelectedFiles(prev => {
        const newSelection = [...prev];
        dirFiles.forEach(file => {
          if (!newSelection.includes(file)) {
            newSelection.push(file);
          }
        });
        console.log("New selected files:", newSelection);
        return newSelection;
      });
    }
  }, []);
  
  // Get all files in a directory and its subdirectories
  const getAllFilesInDir = useCallback((dir: any): string[] => {
    let files: string[] = [];
    
    // Add files in this directory
    if (dir.files) {
      files = files.concat(dir.files.map((file: any) => file.path));
    }
    
    // Add files from subdirectories
    if (dir.dirs) {
      Object.entries(dir.dirs).forEach(([name, subdir]: [string, any]) => {
        files = files.concat(getAllFilesInDir(subdir));
      });
    }
    
    return files;
  }, []);
  
  // Content filtering with debug logging 
  const getFilteredContent = useCallback((): string => {
    if (!repositoryData?.content) {
      return '';
    }
    
    // If all files are selected, return the full content
    if (selectedFiles.length === availableFiles.length) {
      return repositoryData.content;
    }
    
    // If no files are selected, return empty string
    if (selectedFiles.length === 0) {
      return '';
    }
    
    const fullContent = repositoryData.content;
    
    // Debug info
    console.log("=== DEBUG INFO ===");
    console.log(`Selected files (${selectedFiles.length}/${availableFiles.length}): `, selectedFiles);
    
    // Print a sample of the content to see how files are delimited
    console.log("Content sample (first 500 chars):");
    console.log(fullContent.substring(0, 500));
    console.log("End of sample");
    
    // Detect file sections with Line-by-line manual approach
    // This is more robust than regex for complex formats
    const lines = fullContent.split('\n');
    
    // Structure to track file sections
    const filePositions: {filename: string, startLine: number, endLine: number}[] = [];
    
    let currentFile: string | null = null;
    let startLine = 0;
    
    // Simple state machine to parse files
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect file header line (based on raw content sample)
      if (line.startsWith('File:')) {
        // If we found a new file and were tracking an old one, complete it
        if (currentFile) {
          filePositions.push({
            filename: currentFile,
            startLine: startLine,
            endLine: i - 1
          });
        }
        
        // Extract filename
        currentFile = line.substring(5).trim();
        startLine = Math.max(0, i - 1); // Include header line
      }
    }
    
    // Add the last file if we were tracking one
    if (currentFile) {
      filePositions.push({
        filename: currentFile,
        startLine: startLine,
        endLine: lines.length - 1
      });
    }
    
    console.log(`File detection found ${filePositions.length} files:`, 
      filePositions.map(f => f.filename).join(', '));
    
    // Filter based on selected files
    const filteredFilePositions = filePositions.filter(fileObj => 
      selectedFiles.includes(fileObj.filename));
    
    console.log(`After filtering, keeping ${filteredFilePositions.length} files:`, 
      filteredFilePositions.map(f => f.filename).join(', '));
    
    // Rebuild content from selected files
    let filteredLines: string[] = [];
    
    filteredFilePositions.forEach(fileObj => {
      // Add the lines for this file
      const fileLines = lines.slice(fileObj.startLine, fileObj.endLine + 1);
      filteredLines = filteredLines.concat(fileLines);
      
      // Add an empty line between files for better formatting
      if (filteredLines.length > 0) {
        filteredLines.push('');
      }
    });
    
    const filteredContent = filteredLines.join('\n');
    console.log(`Filtered content has ${filteredContent.length} characters`);
    
    return filteredContent;
  }, [repositoryData, selectedFiles, availableFiles]);
  
  return {
    availableFiles,
    selectedFiles,
    fileTree,
    toggleFileSelection,
    toggleSelectAll,
    toggleDirectoryFiles,
    getAllFilesInDir,
    getFilteredContent,
    isFileSelectOpen,
    onFileSelectOpen,
    onFileSelectClose
  };
}

export default useRepositoryAnalysis;
