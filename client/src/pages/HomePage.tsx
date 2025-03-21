import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  Image,
  Flex,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Input,
  FormControl,
  FormLabel,
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
  Code,
  IconButton,
  Tooltip,
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
    } catch (error) {
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
    <Box>
      <Container maxW={'7xl'}>
        <Stack
          align={'center'}
          spacing={{ base: 8, md: 10 }}
          py={{ base: 20, md: 28 }}
          direction={{ base: 'column', md: 'row' }}
        >
          <Stack flex={1} spacing={{ base: 5, md: 10 }}>
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
            <Text color={'gray.500'}>
              CodeInsight enhances code understanding by leveraging AI to analyze GitHub repositories.
              Get intelligent code analysis, vulnerability scanning, and interactive visualizations for your
              codebase.
            </Text>
            <Stack
              spacing={{ base: 4, sm: 6 }}
              direction={{ base: 'column', sm: 'row' }}
            >
              <Button
                as={RouterLink}
                to={isAuthenticated ? '/dashboard' : '/login'}
                rounded={'full'}
                size={'lg'}
                fontWeight={'normal'}
                px={6}
                colorScheme={'brand'}
                bg={'brand.500'}
                _hover={{ bg: 'brand.600' }}
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              </Button>
              <Button
                as={RouterLink}
                to={'/#features'}
                rounded={'full'}
                size={'lg'}
                fontWeight={'normal'}
                px={6}
                leftIcon={<FiCode />}
              >
                Learn more
              </Button>
            </Stack>
          </Stack>
          <Flex
            flex={1}
            justify={'center'}
            align={'center'}
            position={'relative'}
            w={'full'}
          >
            <Box
              position={'relative'}
              height={'300px'}
              rounded={'2xl'}
              boxShadow={'2xl'}
              width={'full'}
              overflow={'hidden'}
            >
              <Image
                alt={'Hero Image'}
                fit={'cover'}
                align={'center'}
                w={'100%'}
                h={'100%'}
                src={
                  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1169&q=80'
                }
              />
            </Box>
          </Flex>
        </Stack>

        {/* GitHub Repository Analysis Section */}
        <Box 
          p={8} 
          mb={10}
          borderRadius="lg" 
          bg={useColorModeValue('white', 'gray.700')}
          boxShadow="xl"
        >
          <Heading as="h2" size="xl" mb={6} textAlign="center">
            Analyze Any GitHub Repository
          </Heading>
          <Text mb={6} textAlign="center">
            Enter a GitHub repository URL to get a detailed analysis of the codebase.
            No login required!
          </Text>
          
          <form onSubmit={handleSubmit}>
            <FormControl mb={4}>
              <FormLabel htmlFor="repositoryUrl">GitHub Repository URL</FormLabel>
              <Flex>
                <Input
                  id="repositoryUrl"
                  placeholder="https://github.com/username/repository"
                  value={repositoryUrl}
                  onChange={handleRepositoryUrlChange}
                  isDisabled={isLoading}
                  pr="4.5rem"
                  flex="1"
                />
                <Button
                  ml={2}
                  colorScheme="brand"
                  isLoading={isLoading}
                  type="submit"
                  leftIcon={<FiGithub />}
                >
                  Analyze
                </Button>
              </Flex>
              <FormHelperText>
                Example: https://github.com/facebook/react
              </FormHelperText>
            </FormControl>
          </form>
          
          {error && (
            <Alert status="error" mt={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}
          
          {isLoading && (
            <Flex justify="center" align="center" direction="column" my={10}>
              <Spinner size="xl" mb={4} color="brand.500" />
              <Text>Processing repository... This may take a few minutes for large repositories.</Text>
            </Flex>
          )}
          
          {result && (
            <Box mt={6}>
              <Tabs colorScheme="brand" variant="enclosed">
                <TabList>
                  <Tab>Summary</Tab>
                  <Tab>File Tree</Tab>
                  <Tab>Content</Tab>
                </TabList>
                
                <TabPanels>
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
                </TabPanels>
              </Tabs>
            </Box>
          )}
        </Box>

        <Box p={4} id="features">
          <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'}>
            <Heading fontSize={'3xl'}>Features</Heading>
            <Text color={'gray.600'} fontSize={'xl'}>
              Powerful tools for developers to understand, analyze, and improve their code
            </Text>
          </Stack>

          <Container maxW={'6xl'} mt={10}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
              <Feature
                icon={<Icon as={FiCode} w={10} h={10} />}
                title={'Code Analysis'}
                text={'AI-powered code review that identifies patterns, best practices, and issues.'}
              />
              <Feature
                icon={<Icon as={FiShield} w={10} h={10} />}
                title={'Security Scanning'}
                text={'Detect security vulnerabilities in your codebase before they become a problem.'}
              />
              <Feature
                icon={<Icon as={FiBarChart2} w={10} h={10} />}
                title={'Interactive Visualizations'}
                text={'Explore your codebase with intuitive visualizations that show dependencies and structure.'}
              />
            </SimpleGrid>
          </Container>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
