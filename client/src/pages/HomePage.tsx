import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { FiCode, FiShield, FiBarChart2, FiCopy, FiGithub } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

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
  const { isAuthenticated } = useAuth();
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: string;
    tree: string;
    content: string;
  } | null>(null);
  const toast = useToast();

  const handleRepositoryUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepositoryUrl(e.target.value);
  };

  const handleGitHubAuth = () => {
    // Redirect to GitHub auth endpoint
    window.location.href = '/api/auth/github';
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
      const response = await axios.post('/api/analysis/public/ingest', {
        repositoryUrl,
      });

      setResult(response.data.content);
      toast({
        title: 'Repository processed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error processing repository:', error);
      setError(
        error.response?.data?.message ||
        'Failed to process repository. Please check the URL and try again.'
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
      <Container maxW={'4xl'} pt={10} pb={10}>
        <VStack spacing={10}>
          {/* Hero Section */}
          <VStack textAlign="center" spacing={6}>
            <Heading
              lineHeight={1.1}
              fontWeight={600}
              fontSize={{ base: '3xl', sm: '4xl', lg: '6xl' }}
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
              fontSize={{ base: 'md', md: 'lg' }}
            >
              CodeInsight enhances code understanding by leveraging AI to analyze GitHub repositories.
              Get intelligent code analysis, vulnerability scanning, and interactive visualizations for your
              codebase.
            </Text>
          </VStack>

          {/* Repository Entry Form */}
          <Box
            w="full"
            p={6}
            borderRadius="lg"
            bg={useColorModeValue('white', 'gray.700')}
            boxShadow="md"
          >
            <VStack spacing={4}>
              <Heading as="h2" size="md" textAlign="center">
                Enter a GitHub Repository URL to Analyze
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
                      size="lg"
                    />
                    <FormHelperText>
                      Example: https://github.com/facebook/react
                    </FormHelperText>
                  </FormControl>
                  
                  <Flex w="full" justify="center" gap={3}>
                    <Button
                      colorScheme="brand"
                      isLoading={isLoading}
                      type="submit"
                      leftIcon={<FiGithub />}
                      size="md"
                      width={{ base: 'full', md: 'auto' }}
                    >
                      Analyze Repository
                    </Button>
                    
                    {!isAuthenticated && (
                      <Button
                        colorScheme="gray"
                        onClick={handleGitHubAuth}
                        leftIcon={<FiGithub />}
                        size="md"
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
                        size="md"
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
              <Text>Processing repository... This may take a few minutes for large repositories.</Text>
            </Box>
          )}

          {/* Results Section */}
          {result && (
            <Box
              w="full"
              p={6}
              borderRadius="lg"
              bg={useColorModeValue('white', 'gray.700')}
              boxShadow="md"
            >
              <Heading as="h3" size="md" mb={4} textAlign="center">
                Analysis Results
              </Heading>
              
              <Tabs colorScheme="brand" variant="enclosed" isFitted>
                <TabList>
                  <Tab>Content</Tab>
                  <Tab>Summary</Tab>
                  <Tab>File Tree</Tab>
                </TabList>
                
                <TabPanels>
                  <TabPanel>
                    <Flex justify="flex-end" mb={2}>
                      <Tooltip label="Copy to clipboard">
                        <IconButton
                          aria-label="Copy content"
                          icon={<FiCopy />}
                          size="sm"
                          onClick={() => copyToClipboard(result.content, 'Content')}
                        />
                      </Tooltip>
                    </Flex>
                    <Box
                      p={4}
                      borderRadius="md"
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      overflowY="auto"
                      maxHeight="500px"
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                    >
                      {result.content}
                    </Box>
                  </TabPanel>
                  
                  <TabPanel>
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
                      p={4}
                      borderRadius="md"
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      overflowY="auto"
                      maxHeight="500px"
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                    >
                      {result.summary}
                    </Box>
                  </TabPanel>
                  
                  <TabPanel>
                    <Flex justify="flex-end" mb={2}>
                      <Tooltip label="Copy to clipboard">
                        <IconButton
                          aria-label="Copy file tree"
                          icon={<FiCopy />}
                          size="sm"
                          onClick={() => copyToClipboard(result.tree, 'File Tree')}
                        />
                      </Tooltip>
                    </Flex>
                    <Box
                      p={4}
                      borderRadius="md"
                      bg={useColorModeValue('gray.50', 'gray.800')}
                      overflowY="auto"
                      maxHeight="500px"
                      whiteSpace="pre-wrap"
                      fontFamily="monospace"
                    >
                      {result.tree}
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          )}

          {/* Features Section */}
          <Box id="features" w="full">
            <VStack spacing={6} textAlign="center">
              <Heading fontSize={'2xl'}>Features</Heading>
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} w="full">
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
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;
