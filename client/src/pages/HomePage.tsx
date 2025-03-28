import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Input,
  FormControl,
  FormHelperText,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Spinner,
  IconButton,
  Tooltip,
  VStack,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Checkbox,
  Badge,
  Collapse,
} from '@chakra-ui/react';
import { FiCode, FiShield, FiBarChart2, FiCopy, FiGithub, FiSettings, FiChevronDown, FiChevronRight, FiFile, FiFolder } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import AiInsightsTab from '../components/AiInsightsTab';
import CoreElementsTab from '../components/CoreElementsTab';
import IosAppTab from '../components/IosAppTab';

// File Tree View Component
interface FileTreeNodeProps {
  name: string;
  path?: string;
  children?: any;
  isFile: boolean;
  selectedFiles: string[];
  toggleFile: (path: string) => void;
  toggleDirectory: (files: string[], isSelected: boolean) => void;
  getAllFilesInDir: (dir: any) => string[];
  level?: number;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  name,
  path,
  children,
  isFile,
  selectedFiles,
  toggleFile,
  toggleDirectory,
  getAllFilesInDir,
  level = 0
}) => {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first two levels
  const bg = useColorModeValue('gray.50', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.600');

  if (isFile && path) {
    // File node
    return (
      <Flex 
        pl={`${level * 20 + 12}px`}
        py={1}
        alignItems="center"
        borderRadius="md"
        _hover={{ bg: hoverBg }}
        cursor="pointer"
        onClick={() => toggleFile(path)}
      >
        <Checkbox 
          isChecked={selectedFiles.includes(path)}
          mr={2}
          onChange={(e) => {
            e.stopPropagation();
            toggleFile(path);
          }}
        />
        <Icon as={FiFile} mr={2} color="gray.500" />
        <Text fontSize="sm" isTruncated>{name}</Text>
      </Flex>
    );
  }

  // Directory node
  const dirFiles = children ? getAllFilesInDir(children) : [];
  const isSelected = dirFiles.length > 0 && dirFiles.every(file => selectedFiles.includes(file));
  const isPartiallySelected = dirFiles.some(file => selectedFiles.includes(file)) && !isSelected;

  return (
    <Box>
      <Flex 
        pl={`${level * 20 + 4}px`}
        py={1}
        alignItems="center"
        borderRadius="md"
        _hover={{ bg: hoverBg }}
        cursor="pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon 
          as={isOpen ? FiChevronDown : FiChevronRight} 
          mr={2}
          w={4}
          h={4}
        />
        <Checkbox 
          isChecked={isSelected}
          isIndeterminate={isPartiallySelected}
          mr={2}
          onChange={(e) => {
            e.stopPropagation();
            toggleDirectory(dirFiles, isSelected);
          }}
        />
        <Icon as={FiFolder} mr={2} color="blue.500" />
        <Text fontWeight="medium" fontSize="sm">{name}</Text>
        {dirFiles.length > 0 && (
          <Badge ml={2} colorScheme="blue" fontSize="xs">
            {dirFiles.length}
          </Badge>
        )}
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        {children && (
          <Box>
            {/* Render files in this directory */}
            {children.files && children.files.map((file: any) => (
              <FileTreeNode
                key={file.path}
                name={file.name}
                path={file.path}
                isFile={true}
                selectedFiles={selectedFiles}
                toggleFile={toggleFile}
                toggleDirectory={toggleDirectory}
                getAllFilesInDir={getAllFilesInDir}
                level={level + 1}
              />
            ))}
            
            {/* Render subdirectories */}
            {children.dirs && Object.entries(children.dirs).map(([dirName, dirContents]: [string, any]) => (
              <FileTreeNode
                key={dirName}
                name={dirName}
                isFile={false}
                children={dirContents}
                selectedFiles={selectedFiles}
                toggleFile={toggleFile}
                toggleDirectory={toggleDirectory}
                getAllFilesInDir={getAllFilesInDir}
                level={level + 1}
              />
            ))}
          </Box>
        )}
      </Collapse>
    </Box>
  );
};

const FileTreeView: React.FC<{
  tree: any;
  selectedFiles: string[];
  toggleFile: (path: string) => void;
  toggleDirectory: (files: string[], isSelected: boolean) => void;
  getAllFilesInDir: (dir: any) => string[];
}> = ({ tree, selectedFiles, toggleFile, toggleDirectory, getAllFilesInDir }) => {
  return (
    <Box>
      {/* Root directories */}
      {tree.dirs && Object.entries(tree.dirs).map(([dirName, dirContents]: [string, any]) => (
        <FileTreeNode
          key={dirName}
          name={dirName}
          isFile={false}
          children={dirContents}
          selectedFiles={selectedFiles}
          toggleFile={toggleFile}
          toggleDirectory={toggleDirectory}
          getAllFilesInDir={getAllFilesInDir}
        />
      ))}
      
      {/* Root files */}
      {tree.files && tree.files.map((file: any) => (
        <FileTreeNode
          key={file.path}
          name={file.name}
          path={file.path}
          isFile={true}
          selectedFiles={selectedFiles}
          toggleFile={toggleFile}
          toggleDirectory={toggleDirectory}
          getAllFilesInDir={getAllFilesInDir}
        />
      ))}
    </Box>
  );
};

const Feature = ({ title, text, icon }: { title: string; text: string; icon: React.ReactElement }) => {
  return (
    <Stack align={'center'} textAlign={'center'}>
      <Flex
        w={16}
        h={16}
        align={'center'}
        justify={'center'}
        color={'white'}
        rounded={'full'}
        bg={'brand.500'}
        mb={1}
      >
        {icon}
      </Flex>
      <Text fontWeight={600}>{title}</Text>
      <Text color={'gray.600'}>{text}</Text>
    </Stack>
  );
};
const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: string;
    tree: string;
    content: string;
  } | null>(null);
  const toast = useToast();
  
  // File selection state for content display filtering
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [fileTree, setFileTree] = useState<any>({});
  const { isOpen: isFileSelectOpen, onOpen: onFileSelectOpen, onClose: onFileSelectClose } = useDisclosure();

  // Parse content to extract available files when result changes
  useEffect(() => {
    if (result?.content) {
      const files = parseFilesFromContent(result.content);
      setAvailableFiles(files);
      setSelectedFiles(files); // Initially select all files
      
      // Build file tree structure
      const tree = buildFileTree(files);
      setFileTree(tree);
    }
  }, [result]);
  
  // Build a tree structure from file paths
  const buildFileTree = (files: string[]) => {
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
  };
  
  // Parse ingested content to extract individual files using the exact boundary format
  const parseFilesFromContent = (content: string): string[] => {
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
  };
  
  // Handle file selection toggle
  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileName)) {
        return prev.filter(f => f !== fileName);
      } else {
        return [...prev, fileName];
      }
    });
  };
  
  // Toggle select all files
  const toggleSelectAll = () => {
    if (selectedFiles.length === availableFiles.length) {
      setSelectedFiles([]);
      setSelectAll(false);
    } else {
      setSelectedFiles([...availableFiles]);
      setSelectAll(true);
    }
  };
  
  // Toggle all files in a directory
  const toggleDirectoryFiles = (dirFiles: string[], isSelected: boolean) => {
    if (isSelected) {
      // Remove all these files
      setSelectedFiles(prev => prev.filter(f => !dirFiles.includes(f)));
    } else {
      // Add files that aren't already selected
      setSelectedFiles(prev => {
        const newSelection = [...prev];
        dirFiles.forEach(file => {
          if (!newSelection.includes(file)) {
            newSelection.push(file);
          }
        });
        return newSelection;
      });
    }
  };
  
  // Get all files in a directory and its subdirectories
  const getAllFilesInDir = (dir: any): string[] => {
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
  };
  
  // Ultra-simplified content filtering with extensive debugging
  const getFilteredContent = (): string => {
    if (!result?.content) {
      return '';
    }
    
    // If all files are selected, return the full content
    if (selectedFiles.length === availableFiles.length) {
      return result.content;
    }
    
    // If no files are selected, return empty string
    if (selectedFiles.length === 0) {
      return '';
    }
    
    const fullContent = result.content;
    
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
  };

  const handleRepositoryUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepositoryUrl(e.target.value);
  };

  const handleGitHubAuth = () => {
    // Redirect to GitHub auth endpoint
    window.location.href = '/api/auth/github';
  };

  // Function to extract username and repo name from GitHub URL
  const extractGitHubInfo = (url: string) => {
    const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        username: match[1],
        repoName: match[2]
      };
    }
    return null;
  };

  // Function to get user's repositories and find a matching one
  const findUserRepositoryByUrl = async (repoName: string): Promise<string | null> => {
    try {
      // Get user's repositories
      const response = await axios.get('/api/repositories');
      const repositories = response.data;
      
      // Find repository with matching name
      const matchingRepo = repositories.find((repo: any) => 
        repo.name.toLowerCase() === repoName.toLowerCase()
      );
      
      return matchingRepo ? matchingRepo._id : null;
    } catch (error) {
      console.error('Error fetching user repositories:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate GitHub URL format
    const githubUrlRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+/;
    if (!githubUrlRegex.test(repositoryUrl)) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract GitHub username and repository name from URL
      const gitHubInfo = extractGitHubInfo(repositoryUrl);
      
      // Check if user is authenticated and if the repository belongs to the current user
      if (isAuthenticated && user && gitHubInfo && gitHubInfo.username === user.username) {
        // Try to process as user's private repository
        try {
          // Find repository ID from user's repositories
          const repositoryId = await findUserRepositoryByUrl(gitHubInfo.repoName);
          
          if (repositoryId) {
            // Process as authenticated user's repository
            const response = await axios.post(`/api/analysis/repository/${repositoryId}/ingest`);
            
            // Get the processed content
            const contentResponse = await axios.get(`/api/analysis/repository/${repositoryId}/ingest`);
            
            setResult(contentResponse.data);
            
            // Check if ingestedRepositoryId is returned
            if (response.data.ingestedRepositoryId) {
              console.log(`Repository ingested and saved with ID: ${response.data.ingestedRepositoryId}`);
              // You can store this ID if needed for further operations
            }
            
            toast({
              title: 'Repository analysis complete!',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
            setIsLoading(false);
            return;
          }
        } catch (privateError) {
          console.error('Error processing private repository:', privateError);
          // Continue to try public processing if private processing fails
        }
      }
      
      // Fall back to public repository processing
      const response = await axios.post('/api/analysis/public/ingest', {
        repositoryUrl,
      });

      // Check if the API returned content or an ingestedRepositoryId
      if (response.data.content) {
        setResult(response.data.content);
      } else if (response.data.result) {
        setResult(response.data.result);
      }
      
      // Check if ingestedRepositoryId is returned
      if (response.data.ingestedRepositoryId) {
        console.log(`Public repository ingested and saved with ID: ${response.data.ingestedRepositoryId}`);
        // You can store this ID if needed for further operations
      }
      
      toast({
        title: 'Repository analysis complete!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error processing repository:', error);
      setError(
        error.response?.data?.message ||
        'We couldn\'t analyze this repository. Please check the URL and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} copied to clipboard`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh">
      <Container maxW={{ base: '95%', md: '90%', lg: '4xl' }} pt={{ base: 5, md: 10 }} pb={{ base: 5, md: 10 }}>
        <VStack spacing={{ base: 6, md: 10 }}>
          {/* Hero Section */}
          <VStack textAlign="center" spacing={{ base: 4, md: 6 }}>
            <Heading
              lineHeight={1.1}
              fontWeight={600}
              fontSize={{ base: '2xl', sm: '3xl', md: '4xl', lg: '6xl' }}
            >
              <Text
                as={'span'}
                position={'relative'}
                _after={{
                  content: "''",
                  width: 'full',
                  height: '30%',
                  position: 'absolute',
                  bottom: 1,
                  left: 0,
                  bg: 'brand.400',
                  zIndex: -1,
                }}
              >
                Understand code
              </Text>
              <br />
              <Text as={'span'} color={'brand.500'}>
                with AI assistance
              </Text>
            </Heading>
            <Text
              color={'gray.500'}
              maxW={'2xl'}
              fontSize={{ base: 'sm', md: 'md', lg: 'lg' }}
            >
              CodeInsight enhances code understanding by leveraging AI to analyze GitHub repositories.
              Get intelligent code analysis, vulnerability scanning, and interactive visualizations for your
              codebase.
            </Text>
          </VStack>

          {/* Repository Entry Form */}
          <Box
            w="full"
            p={{ base: 4, md: 6 }}
            borderRadius="lg"
            bg={useColorModeValue('white', 'gray.700')}
            boxShadow="md"
          >
            <VStack spacing={4}>
              <Heading as="h2" size="md" textAlign="center">
                Analyze a GitHub Repository
              </Heading>
              
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack spacing={3}>
                  <FormControl>
                    <Input
                      id="repositoryUrl"
                      placeholder="https://github.com/username/repository"
                      value={repositoryUrl}
                      onChange={handleRepositoryUrlChange}
                      isDisabled={isLoading}
                      size={{ base: "md", md: "lg" }}
                    />
                    <FormHelperText>
                      Paste any public GitHub repository link to analyze its code
                    </FormHelperText>
                  </FormControl>
                  
                  <Flex w="full" justify="center" gap={3} direction={{ base: 'column', md: 'row' }}>
                    <Button
                      colorScheme="brand"
                      isLoading={isLoading}
                      type="submit"
                      leftIcon={<FiGithub />}
                      size={{ base: "sm", md: "md" }}
                      width={{ base: 'full', md: 'auto' }}
                    >
                      Analyze Code
                    </Button>
                    
                    {!isAuthenticated && (
                      <Button
                        colorScheme="gray"
                        onClick={handleGitHubAuth}
                        leftIcon={<FiGithub />}
                        size={{ base: "sm", md: "md" }}
                        width={{ base: 'full', md: 'auto' }}
                      >
                        Continue with GitHub
                      </Button>
                    )}
                    
                    {isAuthenticated && (
                      <Button
                        as={RouterLink}
                        to="/dashboard"
                        colorScheme="gray"
                        leftIcon={<FiCode />}
                        size={{ base: "sm", md: "md" }}
                        width={{ base: 'full', md: 'auto' }}
                      >
                        My Repositories
                      </Button>
                    )}
                  </Flex>
                </VStack>
              </form>
              
              {error && (
                <Alert status="error" mt={4} borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </VStack>
          </Box>

          {/* Loading Section */}
          {isLoading && (
            <Box textAlign="center" py={6}>
              <Spinner size="xl" mb={4} color="brand.500" />
              <Text>Analyzing repository code... This might take a few minutes for larger repositories.</Text>
            </Box>
          )}

          {/* Results Section */}
          {result && (
            <Box
              w="full"
              p={{ base: 3, md: 6 }}
              borderRadius="lg"
              bg={useColorModeValue('white', 'gray.700')}
              boxShadow="md"
            >
              <Heading as="h3" size={{ base: "sm", md: "md" }} mb={4} textAlign="center">
                Analysis Results
              </Heading>
              
              <Tabs colorScheme="brand" variant="enclosed" isFitted size={{ base: "sm", md: "md" }}>
                <TabList overflowX={{ base: "auto", md: "visible" }} flexWrap={{ base: "nowrap", md: "wrap" }}>
                  <Tab minW={{ base: "100px", md: "auto" }}>Content</Tab>
                  <Tab minW={{ base: "100px", md: "auto" }}>Summary</Tab>
                  <Tab minW={{ base: "100px", md: "auto" }}>File Tree</Tab>
                  <Tab minW={{ base: "100px", md: "auto" }}>AI Insights</Tab>
                  <Tab minW={{ base: "100px", md: "auto" }}>Core Elements</Tab>
                  <Tab minW={{ base: "100px", md: "auto" }}>iOS App</Tab>
                </TabList>
                
                <TabPanels>
                  <TabPanel p={{ base: 2, md: 4 }}>
                    <Flex justify="space-between" mb={2} direction={{ base: "column", sm: "row" }} gap={2}>
                      <HStack>
                        <Badge colorScheme="blue">
                          {selectedFiles.length} of {availableFiles.length} files
                        </Badge>
                      </HStack>
                      
                      <HStack justifyContent={{ base: "flex-start", sm: "flex-end" }} width={{ base: "100%", sm: "auto" }}>
                        <Tooltip label="Select files to display">
                          <IconButton
                            aria-label="File settings"
                            icon={<FiSettings />}
                            size="sm"
                            onClick={onFileSelectOpen}
                          />
                        </Tooltip>
                        
                        <Tooltip label="Copy to clipboard">
                          <IconButton
                            aria-label="Copy content"
                            icon={<FiCopy />}
                            size="sm"
                            onClick={() => copyToClipboard(getFilteredContent(), 'Content')}
                          />
                        </Tooltip>
                      </HStack>
                    </Flex>
                    <Box
                      p={{ base: 2, md: 4 }}
                      borderRadius="md"
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      overflowY="auto"
                      maxHeight={{ base: "300px", md: "500px" }}
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                      fontSize={{ base: "xs", md: "sm" }}
                    >
                      {getFilteredContent()}
                    </Box>
                  </TabPanel>
                  
                  <TabPanel p={{ base: 2, md: 4 }}>
                    <Flex justify="flex-end" mb={2}>
                      <Tooltip label="Copy to clipboard">
                        <IconButton
                          aria-label="Copy summary"
                          icon={<FiCopy />}
                          size="sm"
                          onClick={() => copyToClipboard(result.summary, 'Summary')}
                        />
                      </Tooltip>
                    </Flex>
                    <Box
                      p={{ base: 2, md: 4 }}
                      borderRadius="md"
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      overflowY="auto"
                      maxHeight={{ base: "300px", md: "500px" }}
                      whiteSpace="pre-wrap"
                      fontSize={{ base: "xs", md: "sm" }}
                    >
                      {result.summary}
                    </Box>
                  </TabPanel>
                  
                  <TabPanel p={{ base: 2, md: 4 }}>
                    <Box 
                      p={{ base: 2, md: 4 }}
                      borderRadius="md"
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      overflowY="auto"
                      maxHeight={{ base: "300px", md: "500px" }}
                      fontSize={{ base: "xs", md: "sm" }}
                    >
                      {result.tree}
                    </Box>
                  </TabPanel>
                  
                  {/* AI Insights Tab */}
                  <TabPanel>
                    <AiInsightsTab 
                      repositoryUrl={repositoryUrl} 
                      onCopyToClipboard={copyToClipboard} 
                    />
                  </TabPanel>
                  
                  {/* Core Elements Tab */}
                  <TabPanel>
                    <CoreElementsTab 
                      repositoryUrl={repositoryUrl} 
                      onCopyToClipboard={copyToClipboard} 
                    />
                  </TabPanel>
                  
                  {/* iOS App Tab */}
                  <TabPanel>
                    <IosAppTab 
                      repositoryUrl={repositoryUrl} 
                      onCopyToClipboard={copyToClipboard} 
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          )}
          {/* File Selection Modal */}
          <Modal isOpen={isFileSelectOpen} onClose={onFileSelectClose} size={{ base: "sm", md: "md", lg: "lg" }}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader fontSize={{ base: "md", md: "lg" }}>Select Files to Display</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack align="stretch" spacing={4}>
                  <Flex justify="space-between" align="center">
                    <Text fontSize={{ base: "sm", md: "md" }}>
                      {selectedFiles.length} of {availableFiles.length} files selected
                    </Text>
                    <Button size="sm" onClick={toggleSelectAll}>
                      {selectedFiles.length === availableFiles.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </Flex>
                  
                  <Box 
                    borderWidth="1px" 
                    borderRadius="md" 
                    p={2}
                    maxHeight={{ base: "250px", md: "350px" }} 
                    overflowY="auto"
                    fontSize={{ base: "xs", md: "sm" }}
                  >
                    {availableFiles.length === 0 ? (
                      <Box p={5} borderWidth="1px" borderRadius="md" bg="gray.50" textAlign="center">
                        <Text color="gray.500">No files detected in the repository content.</Text>
                        <Text fontSize="sm" mt={2}>Try processing a different repository or check the content format.</Text>
                      </Box>
                    ) : (
                      <Box 
                        p={2}
                        borderRadius="md"
                        bg={useColorModeValue('white', 'gray.700')}
                      >
                        {Object.keys(fileTree).length === 0 ? (
                          // Flat file list fallback
                          <VStack align="stretch" spacing={1}>
                            {availableFiles.map((file) => (
                              <Flex 
                                key={file} 
                                p={2} 
                                borderRadius="md" 
                                _hover={{ bg: 'gray.100' }}
                                onClick={() => toggleFileSelection(file)}
                                cursor="pointer"
                                align="center"
                              >
                                <Checkbox 
                                  isChecked={selectedFiles.includes(file)}
                                  mr={2}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleFileSelection(file);
                                  }}
                                />
                                <Text>{file}</Text>
                              </Flex>
                            ))}
                          </VStack>
                        ) : (
                          // Tree view
                          <FileTreeView 
                            tree={fileTree} 
                            selectedFiles={selectedFiles}
                            toggleFile={toggleFileSelection}
                            toggleDirectory={toggleDirectoryFiles}
                            getAllFilesInDir={getAllFilesInDir}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                  
                  <Box p={3} borderWidth="1px" borderRadius="md" bg="blue.50">
                    <Text fontSize="sm">
                      Select which files you want to display in the Content tab. Changes will apply immediately when you close this dialog.
                    </Text>
                  </Box>
                </VStack>
              </ModalBody>
              
              <ModalFooter>
                <Button variant="outline" onClick={onFileSelectClose}>
                  Close
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
          {/* Features Section */}
          <Box w="full" py={10}>
            <Heading as="h2" size={{ base: "lg", md: "xl" }} textAlign="center" mb={10}>
              Key Features
            </Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 5, md: 10 }}>
              <Feature
                icon={<Icon as={FiCode} w={8} h={8} />}
                title={'Code Analysis'}
                text={'AI-powered code review that identifies patterns and issues.'}
              />
              <Feature
                icon={<Icon as={FiShield} w={8} h={8} />}
                title={'Security Scanning'}
                text={'Detect security vulnerabilities in your codebase.'}
              />
              <Feature
                icon={<Icon as={FiBarChart2} w={8} h={8} />}
                title={'Visualizations'}
                text={'Explore your codebase with intuitive visualizations.'}
              />
            </SimpleGrid>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;
