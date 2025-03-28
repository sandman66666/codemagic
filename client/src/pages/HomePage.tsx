import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Text,
  Heading,
  Flex,
  Input,
  VStack,
  HStack,
  Badge,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Spinner,
  Stack,
  Checkbox,
  Link,
  useToast,
  useDisclosure,
  useColorModeValue,
  useColorMode,
  Code,
  Container,
  FormControl,
  FormHelperText,
  SimpleGrid,
  Icon,
  Collapse,
} from '@chakra-ui/react';
import { FiCode, FiShield, FiBarChart2, FiCopy, FiGithub, FiSettings, FiChevronDown, FiChevronRight, FiFile, FiFolder } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import AiInsightsTab from '../components/AiInsightsTab';
import CoreElementsTab from '../components/CoreElementsTab';
import IosAppTab from '../components/IosAppTab';
import RecentRepositories from '../components/RecentRepositories';
import RepositoryAnalysisView from '../components/RepositoryAnalysisView';
import useRepositoryAnalysis from '../hooks/useRepositoryAnalysis';

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
  level = 0,
}) => {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first two levels
  const { colorMode } = useColorMode();
  const bg = colorMode === 'light' ? 'gray.50' : 'gray.700';
  const hoverBg = colorMode === 'light' ? 'gray.100' : 'gray.600';

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
        <Text fontSize="sm" isTruncated>
          {name}
        </Text>
      </Flex>
    );
  }

  // Directory node
  const dirFiles = children ? getAllFilesInDir(children) : [];
  const isSelected = dirFiles.length > 0 && dirFiles.every((file) => selectedFiles.includes(file));
  const isPartiallySelected = dirFiles.some((file) => selectedFiles.includes(file)) && !isSelected;

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
        <Text fontWeight="medium" fontSize="sm">
          {name}
        </Text>
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
  const [result, setResult] = useState<{
    summary: string;
    tree: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { colorMode } = useColorMode();
  
  // Use the repository analysis hook instead of local state
  const {
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
  } = useRepositoryAnalysis({
    content: result?.content,
    summary: result?.summary,
    fileTree: result?.tree
  });

  // Handle file selection toggle
  const toggleFileSelectionWrapper = (fileName: string) => {
    toggleFileSelection(fileName);
  };

  // Toggle select all files
  const toggleSelectAllWrapper = () => {
    toggleSelectAll();
  };

  // Toggle all files in a directory
  const toggleDirectoryFilesWrapper = (dirFiles: string[], isSelected: boolean) => {
    toggleDirectoryFiles(dirFiles, isSelected);
  };

  // Get all files in a directory and its subdirectories
  const getAllFilesInDirWrapper = (dir: any): string[] => {
    return getAllFilesInDir(dir);
  };

  // Copy content to clipboard
  const copyToClipboard = (text: string, type: string = 'Content') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: `${type} copied to clipboard`,
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      })
      .catch(err => {
        toast({
          title: "Failed to copy",
          description: err.message,
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      });
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
      // Try to process as user's private repository
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('url');
    if (urlParam) {
      setRepositoryUrl(urlParam);
    }
  }, []);

  return (
    <Box bg={colorMode === 'light' ? 'gray.50' : 'gray.900'} minH="100vh">
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
            bg={colorMode === 'light' ? 'white' : 'gray.700'}
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
              bg={colorMode === 'light' ? 'white' : 'gray.700'}
              boxShadow="md"
            >
              <Heading as="h3" size={{ base: "sm", md: "md" }} mb={4} textAlign="center">
                Analysis Results
              </Heading>
              
              <RepositoryAnalysisView 
                content={result.content}
                summary={result.summary}
                fileTree={result.tree}
                onCopyToClipboard={copyToClipboard}
                showFileSelector={true}
                selectedFiles={selectedFiles}
                availableFiles={availableFiles}
                onFileSelectOpen={onFileSelectOpen}
                getFilteredContent={getFilteredContent}
                showAllTabs={true}
                AIComponents={{
                  AiInsightsTab: <AiInsightsTab 
                                    repositoryUrl={repositoryUrl} 
                                    onCopyToClipboard={copyToClipboard} 
                                  />,
                  CoreElementsTab: <CoreElementsTab 
                                     repositoryUrl={repositoryUrl} 
                                     onCopyToClipboard={copyToClipboard} 
                                   />,
                  IosAppTab: <IosAppTab 
                               repositoryUrl={repositoryUrl} 
                               onCopyToClipboard={copyToClipboard} 
                             />
                }}
              />
            </Box>
          )}
          {/* File Selection Modal */}
          <Modal
            isOpen={isFileSelectOpen}
            onClose={onFileSelectClose}
            size="md"
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Select Files to Display</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Checkbox
                  isChecked={selectedFiles.length === availableFiles.length}
                  onChange={toggleSelectAll}
                  mb={4}
                >
                  Select All ({availableFiles.length} files)
                </Checkbox>
                
                <Stack spacing={1} maxH="60vh" overflowY="auto">
                  <FileTreeView 
                    tree={fileTree}
                    selectedFiles={selectedFiles}
                    toggleFile={toggleFileSelectionWrapper}
                    toggleDirectory={toggleDirectoryFilesWrapper}
                    getAllFilesInDir={getAllFilesInDirWrapper}
                  />
                </Stack>
              </ModalBody>
              
              <ModalFooter>
                <Button onClick={onFileSelectClose}>Close</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Recent Repositories Section - Always shown when user is authenticated */}
          {isAuthenticated && (
            // Recent repositories section is always shown when the user is authenticated
            <Box
              w="full"
              p={{ base: 4, md: 6 }}
              mt={result ? 10 : 0}  
              borderRadius="lg"
              bg={colorMode === 'light' ? 'white' : 'gray.700'}
              boxShadow="md"
            >
              <RecentRepositories limit={5} />
            </Box>
          )}

          {/* Authentication Hint for Unauthenticated Users */}
          {!isAuthenticated && (
            <Flex 
              p={4} 
              mb={6}
              borderRadius="md" 
              bg={colorMode === 'light' ? 'blue.50' : 'blue.800'}
              border="1px solid"
              borderColor={colorMode === 'light' ? 'blue.100' : 'blue.700'}
              alignItems="center"
              gap={3}
            >
              <Icon 
                as={FiGithub} 
                boxSize={5} 
                color={colorMode === 'light' ? 'blue.600' : 'blue.200'} 
              />
              
              <Box flex="1">
                <Text fontWeight="medium" fontSize="sm" color={colorMode === 'light' ? 'blue.700' : 'blue.200'}>
                  Connect with GitHub to save your analysis history
                </Text>
              </Box>
              
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<Icon as={FiGithub} boxSize={3} />}
                as="a"
                href="/api/auth/github"
              >
                Connect
              </Button>
            </Flex>
          )}

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
