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
  Grid,
  GridItem,
  List,
  ListItem,
  ListIcon,
  Link,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Skeleton,
  useToast,
} from '@chakra-ui/react';
import { 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiFileText, 
  FiInfo, 
  FiDownload, 
  FiShare2 
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { analysisApi } from '../services/api';

// Mock analysis data
// const mockAnalysis = {
//   id: 'new-1', // This matches with the ID from the repository page
//   repository: {
//     id: '1',
//     name: 'project-alpha',
//     owner: 'johndoe',
//   },
//   createdAt: '2025-03-18',
//   summary: {
//     quality: 'B+',
//     security: 'A-',
//     complexity: 'Medium',
//     documentation: 'Good',
//     lines: 12482,
//     issues: 28,
//     vulnerabilities: 3,
//   },
//   keyInsights: [
//     'Well-structured React application with clear component hierarchy',
//     'TypeScript interfaces are properly defined',
//     'Some security vulnerabilities in dependency management',
//     'Good test coverage but missing integration tests',
//     'Authentication implementation follows best practices',
//   ],
//   vulnerabilities: [
//     {
//       id: 'v1',
//       severity: 'High',
//       title: 'Outdated dependency with known vulnerability',
//       description: 'axios@0.19.2 has a known security vulnerability. Update to latest version.',
//       location: 'package.json',
//       line: 15,
//     },
//     {
//       id: 'v2',
//       severity: 'Medium',
//       title: 'Insecure authentication token storage',
//       description: 'Tokens stored in localStorage can be vulnerable to XSS attacks.',
//       location: 'src/auth/AuthContext.tsx',
//       line: 42,
//     },
//     {
//       id: 'v3',
//       severity: 'Low',
//       title: 'Unhandled promise rejection',
//       description: 'API calls missing error handling.',
//       location: 'src/services/api.ts',
//       line: 87,
//     },
//   ],
//   codeQuality: [
//     {
//       id: 'q1',
//       type: 'Improvement',
//       title: 'Extract reusable component',
//       description: 'This form logic is duplicated in multiple components.',
//       location: 'src/components/UserForm.tsx',
//       line: 24,
//     },
//     {
//       id: 'q2',
//       type: 'Warning',
//       title: 'Inefficient rendering',
//       description: 'Missing React.memo or useMemo for expensive calculations.',
//       location: 'src/components/DataTable.tsx',
//       line: 56,
//     },
//   ],
//   keyFiles: [
//     {
//       path: 'src/App.tsx',
//       description: 'Main application component with routing configuration',
//       size: '3.4 KB',
//     },
//     {
//       path: 'src/contexts/AuthContext.tsx',
//       description: 'Authentication context for user management',
//       size: '2.8 KB',
//     },
//     {
//       path: 'src/services/api.ts',
//       description: 'API service for handling backend communication',
//       size: '4.2 KB',
//     },
//   ],
//   documentation: {
//     overview: 'Project Alpha is a React TypeScript application for managing user data. It follows a component-based architecture with context-based state management.',
//     architecture: 'The application uses a layered architecture with UI components, context providers for state, and service modules for external communication.',
//     setup: 'Install dependencies with npm install, configure environment variables, and run with npm start.',
//     deployment: 'The application can be deployed to any static hosting service after building with npm run build.',
//   }
// };

// Helper function to determine badge color based on severity
const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'high':
      return 'red';
    case 'medium':
      return 'orange';
    case 'low':
      return 'yellow';
    default:
      return 'gray';
  }
};

const AnalysisPage: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!analysisId || !isAuthenticated) return;
      
      setLoading(true);
      try {
        const response = await analysisApi.getAnalysisById(analysisId);
        setAnalysis(response.data);
      } catch (error) {
        console.error('Error fetching analysis data:', error);
        toast({
          title: 'Error loading analysis',
          description: 'There was an error loading the analysis details.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [analysisId, isAuthenticated, toast]);

  if (!analysisId) {
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
        {loading ? (
          <>
            <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg">
              <Skeleton height="36px" width="60%" mb={4} />
              <Skeleton height="20px" mb={4} />
              <Skeleton height="20px" width="80%" mb={2} />
            </Box>
            <Box>
              <Skeleton height="40px" mb={4} />
              <Skeleton height="200px" mb={4} />
            </Box>
          </>
        ) : analysis ? (
          <>
            <Box
              p={5}
              shadow="md"
              borderWidth="1px"
              borderRadius="lg"
              bg={useColorModeValue('white', 'gray.700')}
            >
              <HStack justify="space-between" mb={4}>
                <VStack align="start">
                  <Heading size="lg">Analysis Report</Heading>
                  <HStack>
                    <Text color="gray.500">Repository: </Text>
                    <Link color="brand.500" onClick={() => navigate(`/repository/${analysis.repository?._id}`)}>
                      {analysis.repository?.fullName}
                    </Link>
                  </HStack>
                </VStack>
                <HStack>
                  <Button leftIcon={<FiDownload />} variant="outline">
                    Export Report
                  </Button>
                  <Button leftIcon={<FiShare2 />} colorScheme="brand">
                    Share
                  </Button>
                </HStack>
              </HStack>
              
              <Divider my={4} />
              
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
                <GridItem>
                  <VStack align="start">
                    <Text color="gray.500">Analysis Date</Text>
                    <Text fontWeight="bold">{new Date(analysis.createdAt).toLocaleDateString()}</Text>
                  </VStack>
                </GridItem>
                <GridItem>
                  <VStack align="start">
                    <Text color="gray.500">Branch</Text>
                    <Text fontWeight="bold">{analysis.branch}</Text>
                  </VStack>
                </GridItem>
                <GridItem>
                  <VStack align="start">
                    <Text color="gray.500">Commit</Text>
                    <Text fontWeight="bold">{analysis.commit?.substring(0, 7) || 'N/A'}</Text>
                  </VStack>
                </GridItem>
              </Grid>
            </Box>
            
            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>Summary</Tab>
                <Tab>Issues {analysis.issues?.length > 0 && `(${analysis.issues.length})`}</Tab>
                <Tab>Code Quality</Tab>
                <Tab>Documentation</Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel>
                  <Stack spacing={6}>
                    <Box>
                      <Heading size="md" mb={4}>Overview</Heading>
                      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
                        <GridItem>
                          <Box p={4} borderWidth="1px" borderRadius="md" textAlign="center">
                            <Text fontSize="sm" color="gray.500">Code Quality</Text>
                            <Heading size="xl" color={analysis.summary?.quality === 'A' ? 'green.500' : 'orange.500'}>
                              {analysis.summary?.quality || 'N/A'}
                            </Heading>
                          </Box>
                        </GridItem>
                        <GridItem>
                          <Box p={4} borderWidth="1px" borderRadius="md" textAlign="center">
                            <Text fontSize="sm" color="gray.500">Security</Text>
                            <Heading size="xl" color={analysis.summary?.security === 'A' ? 'green.500' : 'orange.500'}>
                              {analysis.summary?.security || 'N/A'}
                            </Heading>
                          </Box>
                        </GridItem>
                        <GridItem>
                          <Box p={4} borderWidth="1px" borderRadius="md" textAlign="center">
                            <Text fontSize="sm" color="gray.500">Complexity</Text>
                            <Heading size="xl">
                              {analysis.summary?.complexity || 'N/A'}
                            </Heading>
                          </Box>
                        </GridItem>
                      </Grid>
                    </Box>
                    
                    <Box>
                      <Heading size="md" mb={4}>Key Insights</Heading>
                      {analysis.insights && analysis.insights.length > 0 ? (
                        <List spacing={2}>
                          {analysis.insights.map((insight: string, index: number) => (
                            <ListItem key={index} display="flex">
                              <ListIcon as={FiCheckCircle} color="green.500" mt={1} />
                              <Text>{insight}</Text>
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Text color="gray.500">No insights available for this analysis.</Text>
                      )}
                    </Box>
                    
                    <Box>
                      <Heading size="md" mb={4}>Statistics</Heading>
                      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
                        <GridItem>
                          <Box p={3} borderWidth="1px" borderRadius="md">
                            <Text fontSize="sm" color="gray.500">Lines of Code</Text>
                            <Text fontWeight="bold" fontSize="xl">{analysis.summary?.lines || 'N/A'}</Text>
                          </Box>
                        </GridItem>
                        <GridItem>
                          <Box p={3} borderWidth="1px" borderRadius="md">
                            <Text fontSize="sm" color="gray.500">Issues</Text>
                            <Text fontWeight="bold" fontSize="xl">{analysis.issues?.length || 0}</Text>
                          </Box>
                        </GridItem>
                        <GridItem>
                          <Box p={3} borderWidth="1px" borderRadius="md">
                            <Text fontSize="sm" color="gray.500">Vulnerabilities</Text>
                            <Text fontWeight="bold" fontSize="xl" color={analysis.vulnerabilities?.length > 0 ? 'red.500' : 'green.500'}>
                              {analysis.vulnerabilities?.length || 0}
                            </Text>
                          </Box>
                        </GridItem>
                        <GridItem>
                          <Box p={3} borderWidth="1px" borderRadius="md">
                            <Text fontSize="sm" color="gray.500">Documentation</Text>
                            <Text fontWeight="bold" fontSize="xl">{analysis.summary?.documentation || 'N/A'}</Text>
                          </Box>
                        </GridItem>
                      </Grid>
                    </Box>
                  </Stack>
                </TabPanel>
                
                <TabPanel>
                  <Stack spacing={6}>
                    <Box>
                      <Heading size="md" mb={4}>Security Vulnerabilities</Heading>
                      {analysis.vulnerabilities && analysis.vulnerabilities.length > 0 ? (
                        <Accordion allowMultiple>
                          {analysis.vulnerabilities.map((vuln: any, index: number) => (
                            <AccordionItem key={index}>
                              <h2>
                                <AccordionButton>
                                  <Box flex="1" textAlign="left" py={1}>
                                    <HStack>
                                      <Badge colorScheme={getSeverityColor(vuln.severity)} mr={2}>
                                        {vuln.severity}
                                      </Badge>
                                      <Text fontWeight="bold">{vuln.title}</Text>
                                    </HStack>
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4}>
                                <Stack spacing={3}>
                                  <Text>{vuln.description}</Text>
                                  <HStack>
                                    <Text fontWeight="bold">Location:</Text>
                                    <Code>{vuln.location}</Code>
                                    {vuln.line && <Text>Line: {vuln.line}</Text>}
                                  </HStack>
                                </Stack>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <Box p={4} borderWidth="1px" borderRadius="md" bg="green.50">
                          <HStack>
                            <FiCheckCircle color="green" />
                            <Text>No security vulnerabilities detected.</Text>
                          </HStack>
                        </Box>
                      )}
                    </Box>
                    
                    <Box>
                      <Heading size="md" mb={4}>Code Issues</Heading>
                      {analysis.issues && analysis.issues.length > 0 ? (
                        <Accordion allowMultiple>
                          {analysis.issues.map((issue: any, index: number) => (
                            <AccordionItem key={index}>
                              <h2>
                                <AccordionButton>
                                  <Box flex="1" textAlign="left" py={1}>
                                    <HStack>
                                      <Badge colorScheme={issue.type === 'Warning' ? 'orange' : 'blue'} mr={2}>
                                        {issue.type}
                                      </Badge>
                                      <Text fontWeight="bold">{issue.title}</Text>
                                    </HStack>
                                  </Box>
                                  <AccordionIcon />
                                </AccordionButton>
                              </h2>
                              <AccordionPanel pb={4}>
                                <Stack spacing={3}>
                                  <Text>{issue.description}</Text>
                                  <HStack>
                                    <Text fontWeight="bold">Location:</Text>
                                    <Code>{issue.location}</Code>
                                    {issue.line && <Text>Line: {issue.line}</Text>}
                                  </HStack>
                                </Stack>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <Box p={4} borderWidth="1px" borderRadius="md" bg="green.50">
                          <HStack>
                            <FiCheckCircle color="green" />
                            <Text>No code issues detected.</Text>
                          </HStack>
                        </Box>
                      )}
                    </Box>
                  </Stack>
                </TabPanel>
                
                <TabPanel>
                  <Stack spacing={6}>
                    <Box>
                      <Heading size="md" mb={4}>Code Quality Analysis</Heading>
                      <Text mb={4}>
                        {analysis.summary?.overview || 'No code quality analysis available.'}
                      </Text>
                    </Box>
                    
                    <Box>
                      <Heading size="md" mb={4}>Key Files</Heading>
                      {analysis.keyFiles && analysis.keyFiles.length > 0 ? (
                        <List spacing={3}>
                          {analysis.keyFiles.map((file: any, index: number) => (
                            <ListItem key={index} p={3} borderWidth="1px" borderRadius="md">
                              <HStack justify="space-between">
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="bold">{file.path}</Text>
                                  <Text fontSize="sm" color="gray.600">{file.description}</Text>
                                </VStack>
                                <Text fontSize="sm" color="gray.500">{file.size}</Text>
                              </HStack>
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Text color="gray.500">No key files identified in this analysis.</Text>
                      )}
                    </Box>
                    
                    <Box>
                      <Heading size="md" mb={4}>Improvement Suggestions</Heading>
                      {analysis.suggestions && analysis.suggestions.length > 0 ? (
                        <List spacing={3}>
                          {analysis.suggestions.map((suggestion: any, index: number) => (
                            <ListItem key={index} display="flex">
                              <ListIcon as={FiInfo} color="blue.500" mt={1} />
                              <Text>{suggestion}</Text>
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Text color="gray.500">No improvement suggestions available.</Text>
                      )}
                    </Box>
                  </Stack>
                </TabPanel>
                
                <TabPanel>
                  <Stack spacing={6}>
                    <Box>
                      <Heading size="md" mb={4}>Project Documentation</Heading>
                      {analysis.documentation ? (
                        <Accordion defaultIndex={[0]} allowMultiple>
                          <AccordionItem>
                            <h2>
                              <AccordionButton>
                                <Box flex="1" textAlign="left">
                                  <Text fontWeight="bold">Overview</Text>
                                </Box>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                              <Text>{analysis.documentation.overview}</Text>
                            </AccordionPanel>
                          </AccordionItem>
                          
                          <AccordionItem>
                            <h2>
                              <AccordionButton>
                                <Box flex="1" textAlign="left">
                                  <Text fontWeight="bold">Architecture</Text>
                                </Box>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                              <Text>{analysis.documentation.architecture}</Text>
                            </AccordionPanel>
                          </AccordionItem>
                          
                          <AccordionItem>
                            <h2>
                              <AccordionButton>
                                <Box flex="1" textAlign="left">
                                  <Text fontWeight="bold">Setup</Text>
                                </Box>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                              <Text>{analysis.documentation.setup}</Text>
                            </AccordionPanel>
                          </AccordionItem>
                          
                          <AccordionItem>
                            <h2>
                              <AccordionButton>
                                <Box flex="1" textAlign="left">
                                  <Text fontWeight="bold">Deployment</Text>
                                </Box>
                                <AccordionIcon />
                              </AccordionButton>
                            </h2>
                            <AccordionPanel pb={4}>
                              <Text>{analysis.documentation.deployment}</Text>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>
                      ) : (
                        <Text color="gray.500">No documentation available for this analysis.</Text>
                      )}
                    </Box>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </>
        ) : (
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="lg" textAlign="center">
            <Heading size="md" mb={4}>Analysis Not Found</Heading>
            <Text mb={4}>The requested analysis could not be found or has been deleted.</Text>
            <Button colorScheme="brand" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </Box>
        )}
      </Stack>
    </Container>
  );
};

export default AnalysisPage;
