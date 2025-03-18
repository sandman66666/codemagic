import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { FiGithub, FiCode, FiLock, FiStar, FiCalendar, FiFilter } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

// Mock data for a single repository
const mockRepository = {
  id: '1',
  name: 'project-alpha',
  fullName: 'johndoe/project-alpha',
  description: 'A scalable React application with TypeScript',
  language: 'TypeScript',
  stars: 42,
  forks: 15,
  private: false,
  lastUpdated: '2025-03-15',
  createdAt: '2024-11-20',
  owner: {
    login: 'johndoe',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
  },
  branches: ['main', 'develop', 'feature/auth'],
  languages: {
    TypeScript: 68,
    JavaScript: 25,
    CSS: 5,
    HTML: 2,
  },
  fileCount: 142,
  totalSize: '3.2 MB',
};

const RepositoryPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [filters, setFilters] = useState({
    includeTests: false,
    includeDocumentation: true,
    includeNodeModules: false,
    maxFileSize: '5',
  });

  // Simulated analysis function
  const startAnalysis = () => {
    setIsAnalyzing(true);
    setProgress(0);
    
    // Simulate progress updates
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.floor(Math.random() * 10);
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setShowAlert(true);
          return 100;
        }
        return newProgress;
      });
    }, 500);
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
              onClick={() => navigate(`/analysis/new-${repoId}`)}
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
              <Heading size="lg">{mockRepository.name}</Heading>
              <Badge colorScheme={mockRepository.private ? 'red' : 'green'}>
                {mockRepository.private ? 'Private' : 'Public'}
              </Badge>
            </HStack>
            <HStack>
              <HStack>
                <FiStar />
                <Text>{mockRepository.stars}</Text>
              </HStack>
              <HStack>
                <FiCode />
                <Text>{mockRepository.language}</Text>
              </HStack>
            </HStack>
          </HStack>
          
          <Text color="gray.600" mb={4}>
            {mockRepository.description}
          </Text>
          
          <HStack spacing={4} mb={4}>
            <HStack>
              <FiCalendar />
              <Text fontSize="sm">Created: {mockRepository.createdAt}</Text>
            </HStack>
            <HStack>
              <FiCalendar />
              <Text fontSize="sm">Last updated: {mockRepository.lastUpdated}</Text>
            </HStack>
          </HStack>
        </Box>
        
        <Tabs variant="enclosed" colorScheme="brand">
          <TabList>
            <Tab>Analysis Settings</Tab>
            <Tab>Repository Info</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Box
                p={5}
                shadow="md"
                borderWidth="1px"
                borderRadius="lg"
                bg={useColorModeValue('white', 'gray.700')}
              >
                <VStack spacing={6} align="start">
                  <Heading size="md">Analysis Configuration</Heading>
                  
                  <FormControl>
                    <FormLabel>Branch to Analyze</FormLabel>
                    <Select 
                      value={selectedBranch} 
                      onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                      {mockRepository.branches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <Box w="100%">
                    <Heading size="sm" mb={3}>File Filters</Heading>
                    <VStack align="start">
                      <Checkbox 
                        isChecked={filters.includeTests}
                        onChange={(e) => handleFilterChange('includeTests', e.target.checked)}
                      >
                        Include test files
                      </Checkbox>
                      <Checkbox 
                        isChecked={filters.includeDocumentation}
                        onChange={(e) => handleFilterChange('includeDocumentation', e.target.checked)}
                      >
                        Include documentation
                      </Checkbox>
                      <Checkbox 
                        isChecked={filters.includeNodeModules}
                        onChange={(e) => handleFilterChange('includeNodeModules', e.target.checked)}
                      >
                        Include node_modules (not recommended)
                      </Checkbox>
                      <FormControl>
                        <FormLabel>Maximum file size (MB)</FormLabel>
                        <Input 
                          type="number" 
                          value={filters.maxFileSize}
                          onChange={(e) => handleFilterChange('maxFileSize', e.target.value)}
                          width="100px"
                        />
                      </FormControl>
                    </VStack>
                  </Box>
                  
                  <Box w="100%">
                    <Heading size="sm" mb={3}>Analysis Options</Heading>
                    <VStack align="start">
                      <Checkbox defaultChecked>Code quality assessment</Checkbox>
                      <Checkbox defaultChecked>Security vulnerability scanning</Checkbox>
                      <Checkbox defaultChecked>Architecture analysis</Checkbox>
                      <Checkbox defaultChecked>Generate documentation</Checkbox>
                    </VStack>
                  </Box>
                  
                  {isAnalyzing && (
                    <Box w="100%">
                      <Text mb={2}>Analyzing repository...</Text>
                      <Progress value={progress} size="sm" colorScheme="brand" borderRadius="md" />
                    </Box>
                  )}
                  
                  <Button
                    colorScheme="brand"
                    size="lg"
                    onClick={startAnalysis}
                    isLoading={isAnalyzing}
                    loadingText="Analyzing"
                    spinnerPlacement="start"
                    width="100%"
                  >
                    Start Analysis
                  </Button>
                </VStack>
              </Box>
            </TabPanel>
            <TabPanel>
              <Box
                p={5}
                shadow="md"
                borderWidth="1px"
                borderRadius="lg"
                bg={useColorModeValue('white', 'gray.700')}
              >
                <VStack spacing={6} align="start">
                  <Heading size="md">Repository Statistics</Heading>
                  
                  <HStack spacing={10}>
                    <VStack align="start">
                      <Text color="gray.500">Repository Size</Text>
                      <Text fontWeight="bold">{mockRepository.totalSize}</Text>
                    </VStack>
                    <VStack align="start">
                      <Text color="gray.500">Files</Text>
                      <Text fontWeight="bold">{mockRepository.fileCount}</Text>
                    </VStack>
                    <VStack align="start">
                      <Text color="gray.500">Branches</Text>
                      <Text fontWeight="bold">{mockRepository.branches.length}</Text>
                    </VStack>
                    <VStack align="start">
                      <Text color="gray.500">Forks</Text>
                      <Text fontWeight="bold">{mockRepository.forks}</Text>
                    </VStack>
                  </HStack>
                  
                  <Divider />
                  
                  <Box w="100%">
                    <Heading size="sm" mb={4}>Language Distribution</Heading>
                    <VStack spacing={2} align="start" w="100%">
                      {Object.entries(mockRepository.languages).map(([lang, percentage]) => (
                        <Box key={lang} w="100%">
                          <Flex justify="space-between" mb={1}>
                            <Text fontSize="sm">{lang}</Text>
                            <Text fontSize="sm">{percentage}%</Text>
                          </Flex>
                          <Progress value={percentage} size="sm" colorScheme="brand" borderRadius="md" />
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default RepositoryPage;
