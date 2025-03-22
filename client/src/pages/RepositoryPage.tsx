import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  HStack,
  VStack,
  Badge,
  Divider,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Checkbox,
  CheckboxGroup,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Skeleton,
  useToast,
  Code,
  TabIndicator,
  Tag,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { FiGithub, FiCode, FiLock, FiStar, FiCalendar, FiFilter, FiFolder, FiFile } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { repositoryApi, analysisApi } from '../services/api';

const RepositoryPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [repository, setRepository] = useState<any>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const toast = useToast();
  const [filters, setFilters] = useState({
    includeTests: false,
    includeDocumentation: true,
    includeNodeModules: false,
    maxFileSize: '5',
  });
  
  // Repository ingest data states
  const [isRepositoryProcessed, setIsRepositoryProcessed] = useState(false);
  const [loadingIngestData, setLoadingIngestData] = useState(false);
  const [processingIngest, setProcessingIngest] = useState(false);
  const [ingestData, setIngestData] = useState<{
    summary: string;
    tree: string;
    content: string;
  }>({
    summary: '',
    tree: '',
    content: '',
  });

  useEffect(() => {
    const fetchRepositoryData = async () => {
      if (!repoId || !isAuthenticated) return;
      
      setLoading(true);
      try {
        // Fetch repository details
        const repoResponse = await repositoryApi.getRepositoryById(repoId);
        setRepository(repoResponse.data);
        
        // Fetch repository branches
        const branchesResponse = await repositoryApi.getRepositoryBranches(repoId);
        setBranches(branchesResponse.data.map((branch: any) => branch.name));
        
        // Set default branch if available
        if (repoResponse.data.defaultBranch) {
          setSelectedBranch(repoResponse.data.defaultBranch);
        }

        // Check if repository has been processed with ingest
        try {
          const processedResponse = await repositoryApi.checkRepositoryProcessed(repoId);
          setIsRepositoryProcessed(processedResponse.data.processed);
          
          if (processedResponse.data.processed) {
            // Fetch ingest data if repository has been processed
            await fetchIngestData();
          }
        } catch (error) {
          console.error('Error checking repository ingest status:', error);
          setIsRepositoryProcessed(false);
        }
      } catch (error) {
        console.error('Error fetching repository data:', error);
        toast({
          title: 'Error loading repository',
          description: 'There was an error loading the repository details.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRepositoryData();
  }, [repoId, isAuthenticated, toast]);

  // Function to fetch repository ingest data
  const fetchIngestData = async () => {
    if (!repoId) return;
    
    setLoadingIngestData(true);
    try {
      // Fetch all ingest data
      const ingestResponse = await repositoryApi.getRepositoryIngestData(repoId);
      setIngestData(ingestResponse.data);
      setIsRepositoryProcessed(true);
    } catch (error) {
      console.error('Error fetching repository ingest data:', error);
      toast({
        title: 'Error loading repository structure',
        description: 'There was an error loading the repository structure data.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingIngestData(false);
    }
  };

  // Function to process repository with ingest
  const processRepositoryIngest = async () => {
    if (!repository) return;
    
    setProcessingIngest(true);
    try {
      await repositoryApi.processRepositoryWithIngest(repository._id);
      
      // Fetch ingest data after processing
      await fetchIngestData();
      
      toast({
        title: 'Repository processed',
        description: 'Repository structure data has been generated successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error processing repository:', error);
      toast({
        title: 'Processing failed',
        description: 'There was an error processing the repository structure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setProcessingIngest(false);
    }
  };

  // Start analysis function
  const startAnalysis = async () => {
    if (!repository) return;
    
    setIsAnalyzing(true);
    setProgress(0);
    
    try {
      // Start the analysis
      const response = await analysisApi.startAnalysis(
        repository._id,
        selectedBranch,
        filters
      );
      
      setAnalysisId(response.data._id);
      
      // Poll for analysis status
      const statusInterval = setInterval(async () => {
        try {
          const statusResponse = await analysisApi.getAnalysisStatus(response.data._id);
          const status = statusResponse.data.status;
          
          // Update progress based on status
          if (status === 'pending') {
            setProgress(10);
          } else if (status === 'processing') {
            setProgress(prev => Math.min(prev + 10, 90));
          } else if (status === 'completed') {
            setProgress(100);
            setIsAnalyzing(false);
            setShowAlert(true);
            clearInterval(statusInterval);
          } else if (status === 'failed') {
            setIsAnalyzing(false);
            clearInterval(statusInterval);
            toast({
              title: 'Analysis failed',
              description: 'There was an error analyzing your repository.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        } catch (error) {
          console.error('Error polling analysis status:', error);
          clearInterval(statusInterval);
          setIsAnalyzing(false);
          toast({
            title: 'Error tracking analysis',
            description: 'There was an error tracking the analysis progress.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      }, 3000);
    } catch (error) {
      console.error('Error starting analysis:', error);
      setIsAnalyzing(false);
      toast({
        title: 'Analysis failed',
        description: 'There was an error starting the analysis.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleFilterChange = (name: string, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!repoId) {
    navigate('/dashboard');
    return null;
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <Container maxW="container.xl" py={5}>
      <Stack spacing={8}>
        {showAlert && (
          <Alert
            status="success"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            borderRadius="md"
          >
            <AlertIcon boxSize="40px" mr={0} />
            <AlertTitle mt={4} mb={1} fontSize="lg">
              Analysis Completed!
            </AlertTitle>
            <AlertDescription maxWidth="sm">
              Your repository has been successfully analyzed.
            </AlertDescription>
            <Button 
              mt={4} 
              colorScheme="brand" 
              onClick={() => navigate(`/analysis/${analysisId}`)}
            >
              View Results
            </Button>
            <CloseButton
              position="absolute"
              right="8px"
              top="8px"
              onClick={() => setShowAlert(false)}
            />
          </Alert>
        )}
        
        {loading ? (
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
            <Skeleton height="36px" width="60%" mb={4} />
            <Skeleton height="20px" mb={4} />
            <Skeleton height="20px" width="80%" mb={2} />
            <Skeleton height="20px" width="40%" mb={4} />
          </Box>
        ) : repository ? (
          <Box
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg={useColorModeValue('white', 'gray.700')}
          >
            <HStack justify="space-between" mb={4}>
              <HStack>
                <FiGithub size={24} />
                <Heading size="lg">{repository.name}</Heading>
                <Badge colorScheme={repository.isPrivate ? 'red' : 'green'}>
                  {repository.isPrivate ? 'Private' : 'Public'}
                </Badge>
              </HStack>
              <HStack>
                <HStack>
                  <FiStar />
                  <Text>{repository.stars}</Text>
                </HStack>
                <HStack>
                  <FiCode />
                  <Text>{repository.language}</Text>
                </HStack>
              </HStack>
            </HStack>
            
            <Text color="gray.600" mb={4}>
              {repository.description}
            </Text>
            
            <HStack spacing={4} mb={4}>
              <HStack>
                <FiCalendar />
                <Text fontSize="sm">Created: {new Date(repository.createdAt).toLocaleDateString()}</Text>
              </HStack>
              <HStack>
                <FiCalendar />
                <Text fontSize="sm">Last updated: {new Date(repository.updatedAt).toLocaleDateString()}</Text>
              </HStack>
            </HStack>
          </Box>
        ) : (
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" textAlign="center">
            <Text>Repository not found</Text>
          </Box>
        )}
        
        <Tabs variant="enclosed" colorScheme="brand">
          <TabList>
            <Tab>Analysis Settings</Tab>
            <Tab>Repository Info</Tab>
            <Tab>Repository Structure</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Stack spacing={6}>
                <Box>
                  <Heading size="sm" mb={3}>Branch to Analyze</Heading>
                  <Select 
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    isDisabled={isAnalyzing || branches.length === 0}
                  >
                    {branches.length > 0 ? (
                      branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))
                    ) : (
                      <option value="main">main</option>
                    )}
                  </Select>
                </Box>
                
                <Box>
                  <Heading size="sm" mb={3}>Analysis Filters</Heading>
                  <Stack spacing={3}>
                    <Checkbox 
                      isChecked={filters.includeTests}
                      onChange={(e) => handleFilterChange('includeTests', e.target.checked)}
                      isDisabled={isAnalyzing}
                    >
                      Include test files
                    </Checkbox>
                    <Checkbox 
                      isChecked={filters.includeDocumentation}
                      onChange={(e) => handleFilterChange('includeDocumentation', e.target.checked)}
                      isDisabled={isAnalyzing}
                    >
                      Include documentation files
                    </Checkbox>
                    <Checkbox 
                      isChecked={filters.includeNodeModules}
                      onChange={(e) => handleFilterChange('includeNodeModules', e.target.checked)}
                      isDisabled={isAnalyzing}
                    >
                      Include node_modules (not recommended)
                    </Checkbox>
                    
                    <FormControl>
                      <FormLabel>Maximum file size to analyze (MB)</FormLabel>
                      <Input 
                        type="number" 
                        value={filters.maxFileSize}
                        onChange={(e) => handleFilterChange('maxFileSize', e.target.value)}
                        isDisabled={isAnalyzing}
                        min="1"
                        max="20"
                      />
                    </FormControl>
                  </Stack>
                </Box>
                
                {isAnalyzing && (
                  <Box>
                    <Text mb={2}>Analysis in progress... {progress}%</Text>
                    <Progress value={progress} size="sm" colorScheme="brand" borderRadius="md" />
                  </Box>
                )}
                
                <Button 
                  colorScheme="brand" 
                  size="lg" 
                  onClick={startAnalysis}
                  isLoading={isAnalyzing}
                  loadingText="Analyzing..."
                  isDisabled={!repository || isAnalyzing}
                >
                  Start Analysis
                </Button>
              </Stack>
            </TabPanel>
            <TabPanel>
              {repository ? (
                <Stack spacing={4}>
                  <Box>
                    <Heading size="sm" mb={2}>Repository Details</Heading>
                    <Stack spacing={2}>
                      <HStack>
                        <Text fontWeight="bold" width="150px">Full Name:</Text>
                        <Text>{repository.fullName}</Text>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold" width="150px">Default Branch:</Text>
                        <Text>{repository.defaultBranch}</Text>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold" width="150px">Language:</Text>
                        <Text>{repository.language}</Text>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold" width="150px">Size:</Text>
                        <Text>{repository.size ? `${(repository.size / 1024).toFixed(2)} MB` : 'Unknown'}</Text>
                      </HStack>
                      <HStack>
                        <Text fontWeight="bold" width="150px">GitHub URL:</Text>
                        <Text color="blue.500" as="a" href={repository.url} target="_blank" rel="noopener noreferrer">
                          {repository.url}
                        </Text>
                      </HStack>
                    </Stack>
                  </Box>
                </Stack>
              ) : (
                <Text>Loading repository information...</Text>
              )}
            </TabPanel>

            {/* Repository Structure Tab */}
            <TabPanel>
              {loadingIngestData ? (
                <Stack spacing={4}>
                  <Skeleton height="30px" width="60%" />
                  <Skeleton height="20px" width="100%" />
                  <Skeleton height="20px" width="90%" />
                  <Skeleton height="20px" width="95%" />
                  <Skeleton height="20px" width="85%" />
                  <Skeleton height="20px" width="80%" />
                </Stack>
              ) : isRepositoryProcessed ? (
                <Stack spacing={6}>
                  {/* Repository Summary */}
                  <Box>
                    <Heading size="sm" mb={3}>Repository Summary</Heading>
                    <Box 
                      p={4} 
                      borderWidth="1px" 
                      borderRadius="lg" 
                      bg={useColorModeValue('gray.50', 'gray.700')}
                    >
                      <Text as="pre" fontFamily="monospace" whiteSpace="pre-wrap">
                        {ingestData.summary}
                      </Text>
                    </Box>
                  </Box>
                  
                  {/* Repository Structure */}
                  <Box>
                    <Heading size="sm" mb={3}>Repository Structure</Heading>
                    <Box 
                      p={4} 
                      borderWidth="1px" 
                      borderRadius="lg" 
                      bg={useColorModeValue('gray.50', 'gray.700')}
                      maxH="400px"
                      overflowY="auto"
                    >
                      <Text as="pre" fontFamily="monospace" whiteSpace="pre-wrap">
                        {ingestData.tree}
                      </Text>
                    </Box>
                  </Box>
                  
                  {/* Repository Content */}
                  <Box>
                    <Heading size="sm" mb={3}>Repository Content</Heading>
                    <Box 
                      p={4} 
                      borderWidth="1px" 
                      borderRadius="lg" 
                      bg={useColorModeValue('gray.50', 'gray.700')}
                      maxH="500px"
                      overflowY="auto"
                    >
                      <Text as="pre" fontFamily="monospace" whiteSpace="pre-wrap">
                        {ingestData.content}
                      </Text>
                    </Box>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={4} align="center">
                  <Box 
                    p={5} 
                    textAlign="center" 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    width="100%"
                  >
                    <Heading size="md" mb={3}>Repository Structure Data Not Available</Heading>
                    <Text mb={5}>
                      This repository hasn't been processed for structure analysis yet. Process it now to see detailed information about the repository structure, summary, and contents.
                    </Text>
                    <Button
                      colorScheme="brand"
                      onClick={processRepositoryIngest}
                      isLoading={processingIngest}
                      loadingText="Processing..."
                      isDisabled={!repository || processingIngest}
                    >
                      Process Repository Structure
                    </Button>
                  </Box>
                </Stack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default RepositoryPage;
