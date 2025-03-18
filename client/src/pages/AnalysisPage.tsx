import React from 'react';
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

// Mock analysis data
const mockAnalysis = {
  id: 'new-1', // This matches with the ID from the repository page
  repository: {
    id: '1',
    name: 'project-alpha',
    owner: 'johndoe',
  },
  createdAt: '2025-03-18',
  summary: {
    quality: 'B+',
    security: 'A-',
    complexity: 'Medium',
    documentation: 'Good',
    lines: 12482,
    issues: 28,
    vulnerabilities: 3,
  },
  keyInsights: [
    'Well-structured React application with clear component hierarchy',
    'TypeScript interfaces are properly defined',
    'Some security vulnerabilities in dependency management',
    'Good test coverage but missing integration tests',
    'Authentication implementation follows best practices',
  ],
  vulnerabilities: [
    {
      id: 'v1',
      severity: 'High',
      title: 'Outdated dependency with known vulnerability',
      description: 'axios@0.19.2 has a known security vulnerability. Update to latest version.',
      location: 'package.json',
      line: 15,
    },
    {
      id: 'v2',
      severity: 'Medium',
      title: 'Insecure authentication token storage',
      description: 'Tokens stored in localStorage can be vulnerable to XSS attacks.',
      location: 'src/auth/AuthContext.tsx',
      line: 42,
    },
    {
      id: 'v3',
      severity: 'Low',
      title: 'Unhandled promise rejection',
      description: 'API calls missing error handling.',
      location: 'src/services/api.ts',
      line: 87,
    },
  ],
  codeQuality: [
    {
      id: 'q1',
      type: 'Improvement',
      title: 'Extract reusable component',
      description: 'This form logic is duplicated in multiple components.',
      location: 'src/components/UserForm.tsx',
      line: 24,
    },
    {
      id: 'q2',
      type: 'Warning',
      title: 'Inefficient rendering',
      description: 'Missing React.memo or useMemo for expensive calculations.',
      location: 'src/components/DataTable.tsx',
      line: 56,
    },
  ],
  keyFiles: [
    {
      path: 'src/App.tsx',
      description: 'Main application component with routing configuration',
      size: '3.4 KB',
    },
    {
      path: 'src/contexts/AuthContext.tsx',
      description: 'Authentication context for user management',
      size: '2.8 KB',
    },
    {
      path: 'src/services/api.ts',
      description: 'API service for handling backend communication',
      size: '4.2 KB',
    },
  ],
  documentation: {
    overview: 'Project Alpha is a React TypeScript application for managing user data. It follows a component-based architecture with context-based state management.',
    architecture: 'The application uses a layered architecture with UI components, context providers for state, and service modules for external communication.',
    setup: 'Install dependencies with npm install, configure environment variables, and run with npm start.',
    deployment: 'The application can be deployed to any static hosting service after building with npm run build.',
  }
};

// Helper function to determine badge color based on severity
const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
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

  if (!analysisId) {
    navigate('/dashboard');
    return null;
  }

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  // In a real app, we would fetch the analysis data based on the ID
  const analysis = mockAnalysis;

  return (
    <Container maxW="container.xl" py={5}>
      <Stack spacing={8}>
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
                <Link color="brand.500" onClick={() => navigate(`/repository/${analysis.repository.id}`)}>
                  {analysis.repository.owner}/{analysis.repository.name}
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
          
          <Grid templateColumns="repeat(12, 1fr)" gap={6}>
            <GridItem colSpan={{ base: 12, md: 6, lg: 3 }}>
              <VStack align="center" bg={useColorModeValue('gray.50', 'gray.800')} p={4} borderRadius="md">
                <Heading size="md">Code Quality</Heading>
                <Heading size="3xl" color="brand.500">{analysis.summary.quality}</Heading>
              </VStack>
            </GridItem>
            
            <GridItem colSpan={{ base: 12, md: 6, lg: 3 }}>
              <VStack align="center" bg={useColorModeValue('gray.50', 'gray.800')} p={4} borderRadius="md">
                <Heading size="md">Security</Heading>
                <Heading size="3xl" color="brand.500">{analysis.summary.security}</Heading>
              </VStack>
            </GridItem>
            
            <GridItem colSpan={{ base: 12, md: 6, lg: 3 }}>
              <VStack align="center" bg={useColorModeValue('gray.50', 'gray.800')} p={4} borderRadius="md">
                <Heading size="md">Issues</Heading>
                <Heading size="3xl" color={analysis.summary.issues > 20 ? "orange.500" : "green.500"}>
                  {analysis.summary.issues}
                </Heading>
              </VStack>
            </GridItem>
            
            <GridItem colSpan={{ base: 12, md: 6, lg: 3 }}>
              <VStack align="center" bg={useColorModeValue('gray.50', 'gray.800')} p={4} borderRadius="md">
                <Heading size="md">Vulnerabilities</Heading>
                <Heading size="3xl" color={analysis.summary.vulnerabilities > 0 ? "red.500" : "green.500"}>
                  {analysis.summary.vulnerabilities}
                </Heading>
              </VStack>
            </GridItem>
          </Grid>
        </Box>
        
        <Box>
          <Heading size="md" mb={4}>Key Insights</Heading>
          <List spacing={3}>
            {analysis.keyInsights.map((insight, index) => (
              <ListItem key={index}>
                <HStack alignItems="flex-start">
                  <ListIcon as={FiInfo} color="brand.500" mt={1} />
                  <Text>{insight}</Text>
                </HStack>
              </ListItem>
            ))}
          </List>
        </Box>
        
        <Tabs variant="enclosed" colorScheme="brand">
          <TabList>
            <Tab>Security</Tab>
            <Tab>Code Quality</Tab>
            <Tab>Documentation</Tab>
            <Tab>Key Files</Tab>
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
                <Heading size="md" mb={4}>Security Vulnerabilities</Heading>
                
                {analysis.vulnerabilities.length === 0 ? (
                  <Flex justify="center" align="center" direction="column" py={10}>
                    <FiCheckCircle size={40} color="green" />
                    <Text mt={4}>No security vulnerabilities found</Text>
                  </Flex>
                ) : (
                  <Accordion allowMultiple>
                    {analysis.vulnerabilities.map((vuln) => (
                      <AccordionItem key={vuln.id}>
                        <h2>
                          <AccordionButton>
                            <Box flex="1" textAlign="left">
                              <HStack>
                                <FiAlertTriangle color={getSeverityColor(vuln.severity) === 'red' ? 'red' : 
                                  getSeverityColor(vuln.severity) === 'orange' ? 'orange' : 'yellow'} />
                                <Badge colorScheme={getSeverityColor(vuln.severity)} mr={2}>
                                  {vuln.severity}
                                </Badge>
                                <Text fontWeight="medium">{vuln.title}</Text>
                              </HStack>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                        </h2>
                        <AccordionPanel pb={4}>
                          <VStack align="start" spacing={2}>
                            <Text>{vuln.description}</Text>
                            <HStack>
                              <Text fontWeight="bold">Location:</Text>
                              <Code>{vuln.location}:{vuln.line}</Code>
                            </HStack>
                            <Box mt={2}>
                              <Button size="sm" colorScheme="brand" variant="outline">
                                View Details
                              </Button>
                            </Box>
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
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
                <Heading size="md" mb={4}>Code Quality Issues</Heading>
                
                {analysis.codeQuality.length === 0 ? (
                  <Flex justify="center" align="center" direction="column" py={10}>
                    <FiCheckCircle size={40} color="green" />
                    <Text mt={4}>No code quality issues found</Text>
                  </Flex>
                ) : (
                  <Accordion allowMultiple>
                    {analysis.codeQuality.map((issue) => (
                      <AccordionItem key={issue.id}>
                        <h2>
                          <AccordionButton>
                            <Box flex="1" textAlign="left">
                              <HStack>
                                <Badge colorScheme={issue.type === 'Warning' ? 'orange' : 'blue'} mr={2}>
                                  {issue.type}
                                </Badge>
                                <Text fontWeight="medium">{issue.title}</Text>
                              </HStack>
                            </Box>
                            <AccordionIcon />
                          </AccordionButton>
                        </h2>
                        <AccordionPanel pb={4}>
                          <VStack align="start" spacing={2}>
                            <Text>{issue.description}</Text>
                            <HStack>
                              <Text fontWeight="bold">Location:</Text>
                              <Code>{issue.location}:{issue.line}</Code>
                            </HStack>
                            <Box mt={2}>
                              <Button size="sm" colorScheme="brand" variant="outline">
                                View Details
                              </Button>
                            </Box>
                          </VStack>
                        </AccordionPanel>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
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
                <Heading size="md" mb={4}>Generated Documentation</Heading>
                
                <Accordion defaultIndex={[0]} allowMultiple>
                  <AccordionItem>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <Heading size="sm">Project Overview</Heading>
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
                          <Heading size="sm">Architecture</Heading>
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
                          <Heading size="sm">Setup Instructions</Heading>
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
                          <Heading size="sm">Deployment Guide</Heading>
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <Text>{analysis.documentation.deployment}</Text>
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
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
                <Heading size="md" mb={4}>Key Files</Heading>
                
                <List spacing={3}>
                  {analysis.keyFiles.map((file, index) => (
                    <ListItem key={index} p={3} borderWidth="1px" borderRadius="md">
                      <HStack justifyContent="space-between">
                        <VStack align="start">
                          <HStack>
                            <FiFileText />
                            <Code>{file.path}</Code>
                          </HStack>
                          <Text color="gray.600" fontSize="sm">{file.description}</Text>
                        </VStack>
                        <HStack>
                          <Badge>{file.size}</Badge>
                          <Button size="sm" colorScheme="brand" variant="ghost">
                            View
                          </Button>
                        </HStack>
                      </HStack>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default AnalysisPage;
