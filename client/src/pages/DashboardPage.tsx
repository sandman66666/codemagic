import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  useColorModeValue,
  VStack,
  HStack,
  Badge,
  Avatar,
  Divider,
  SimpleGrid,
  Skeleton,
} from '@chakra-ui/react';
import { FiSearch, FiGithub, FiClock, FiStar, FiCode, FiLock } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link as RouterLink } from 'react-router-dom';

// Mock data for repositories
const mockRepositories = [
  {
    id: '1',
    name: 'project-alpha',
    description: 'A scalable React application with TypeScript',
    language: 'TypeScript',
    stars: 42,
    private: false,
    lastUpdated: '2 days ago',
    owner: {
      login: 'johndoe',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
    },
  },
  {
    id: '2',
    name: 'api-service',
    description: 'RESTful API service with Express and MongoDB',
    language: 'JavaScript',
    stars: 28,
    private: true,
    lastUpdated: '1 week ago',
    owner: {
      login: 'johndoe',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
    },
  },
];

// Mock data for recent analyses
const mockRecentAnalyses = [
  {
    id: '101',
    repositoryName: 'project-alpha',
    date: '2025-03-15',
    summary: 'Security analysis detected 3 vulnerabilities',
    status: 'Completed',
  },
  {
    id: '102',
    repositoryName: 'api-service',
    date: '2025-03-10',
    summary: 'Code quality improvements suggested',
    status: 'Completed',
  },
];

const RepositoryCard: React.FC<{ repo: any }> = ({ repo }) => {
  return (
    <Box
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      bg={useColorModeValue('white', 'gray.700')}
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)', transition: 'all 0.2s' }}
    >
      <HStack justify="space-between" mb={2}>
        <HStack>
          <FiGithub />
          <Text fontWeight="bold" fontSize="lg">
            {repo.name}
          </Text>
        </HStack>
        <Badge colorScheme={repo.private ? 'red' : 'green'}>
          {repo.private ? 'Private' : 'Public'}
        </Badge>
      </HStack>
      
      <Text color="gray.600" noOfLines={2} mb={4}>
        {repo.description}
      </Text>
      
      <HStack justify="space-between">
        <HStack>
          <Avatar size="xs" src={repo.owner.avatarUrl} />
          <Text fontSize="sm">{repo.owner.login}</Text>
        </HStack>
        <HStack spacing={4}>
          <HStack>
            <FiStar />
            <Text fontSize="sm">{repo.stars}</Text>
          </HStack>
          <HStack>
            <FiCode />
            <Text fontSize="sm">{repo.language}</Text>
          </HStack>
          <HStack>
            <FiClock />
            <Text fontSize="sm">{repo.lastUpdated}</Text>
          </HStack>
        </HStack>
      </HStack>
      
      <Divider my={4} />
      
      <Button
        as={RouterLink}
        to={`/repository/${repo.id}`}
        colorScheme="brand"
        size="sm"
        width="full"
      >
        Analyze Repository
      </Button>
    </Box>
  );
};

const AnalysisCard: React.FC<{ analysis: any }> = ({ analysis }) => {
  return (
    <Box
      p={4}
      shadow="sm"
      borderWidth="1px"
      borderRadius="md"
      bg={useColorModeValue('white', 'gray.700')}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="bold">{analysis.repositoryName}</Text>
        <Badge colorScheme="green">{analysis.status}</Badge>
      </HStack>
      <Text fontSize="sm" color="gray.600" mb={2}>
        {analysis.summary}
      </Text>
      <HStack justify="space-between">
        <Text fontSize="xs" color="gray.500">
          {analysis.date}
        </Text>
        <Button
          as={RouterLink}
          to={`/analysis/${analysis.id}`}
          size="xs"
          colorScheme="brand"
          variant="outline"
        >
          View Details
        </Button>
      </HStack>
    </Box>
  );
};

const DashboardPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const filteredRepos = mockRepositories.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxW="container.xl" py={5}>
      <Stack spacing={8}>
        <Flex justify="space-between" align="center">
          <Heading size="lg">Dashboard</Heading>
          <Text color="gray.600">
            Welcome back, {user?.username || 'User'}
          </Text>
        </Flex>

        <Box>
          <Heading size="md" mb={4}>Your Repositories</Heading>
          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          {loading ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {[1, 2, 3].map((i) => (
                <Box key={i} p={5} shadow="md" borderWidth="1px">
                  <Skeleton height="20px" mb={4} />
                  <Skeleton height="12px" mb={2} />
                  <Skeleton height="12px" mb={2} />
                  <Skeleton height="36px" mt={4} />
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {filteredRepos.map(repo => (
                <RepositoryCard key={repo.id} repo={repo} />
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Box>
          <Heading size="md" mb={4}>Recent Analyses</Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {mockRecentAnalyses.map(analysis => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
};

export default DashboardPage;
