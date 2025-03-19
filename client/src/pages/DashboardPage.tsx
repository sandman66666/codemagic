import React, { useState, useEffect } from 'react';
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
  useToast,
} from '@chakra-ui/react';
import { FiSearch, FiGithub, FiClock, FiStar, FiCode, FiLock, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { repositoryApi, analysisApi } from '../services/api';

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
        <Badge colorScheme={repo.isPrivate ? 'red' : 'green'}>
          {repo.isPrivate ? 'Private' : 'Public'}
        </Badge>
      </HStack>
      
      <Text color="gray.600" noOfLines={2} mb={4}>
        {repo.description}
      </Text>
      
      <HStack justify="space-between">
        <HStack>
          <Avatar size="xs" src={repo.owner?.avatarUrl || ''} />
          <Text fontSize="sm">{repo.fullName?.split('/')[0] || ''}</Text>
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
            <Text fontSize="sm">{new Date(repo.updatedAt).toLocaleDateString()}</Text>
          </HStack>
        </HStack>
      </HStack>
      
      <Divider my={4} />
      
      <Button
        as={RouterLink}
        to={`/repository/${repo._id}`}
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
        <Text fontWeight="bold">{analysis.repository?.name || 'Repository'}</Text>
        <Badge colorScheme={analysis.status === 'completed' ? 'green' : 'yellow'}>
          {analysis.status}
        </Badge>
      </HStack>
      <Text fontSize="sm" color="gray.600" mb={2}>
        {analysis.summary?.overview || 'Analysis in progress...'}
      </Text>
      <HStack justify="space-between">
        <Text fontSize="xs" color="gray.500">
          {new Date(analysis.createdAt).toLocaleDateString()}
        </Text>
        <Button
          as={RouterLink}
          to={`/analysis/${analysis._id}`}
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
  const [loading, setLoading] = useState(true);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [syncingRepos, setSyncingRepos] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch repositories
        const reposResponse = await repositoryApi.getUserRepositories();
        setRepositories(reposResponse.data);
        
        // Fetch recent analyses
        const analysesResponse = await analysisApi.getUserAnalyses();
        setAnalyses(analysesResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error fetching data',
          description: 'There was an error loading your dashboard data.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, toast]);

  const handleSyncRepositories = async () => {
    setSyncingRepos(true);
    try {
      const response = await repositoryApi.syncRepositories();
      setRepositories(response.data);
      toast({
        title: 'Repositories synced',
        description: `Successfully synced ${response.data.length} repositories from GitHub.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error syncing repositories:', error);
      toast({
        title: 'Sync failed',
        description: 'There was an error syncing your repositories from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSyncingRepos(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const filteredRepos = repositories.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Your Repositories</Heading>
            <Button 
              leftIcon={<FiRefreshCw />} 
              colorScheme="brand" 
              size="sm"
              isLoading={syncingRepos}
              onClick={handleSyncRepositories}
            >
              Sync Repositories
            </Button>
          </Flex>
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
                <Box key={i} p={5} shadow="md" borderWidth="1px" borderRadius="lg">
                  <Skeleton height="24px" width="60%" mb={4} />
                  <Skeleton height="16px" mb={2} />
                  <Skeleton height="16px" mb={4} />
                  <Skeleton height="24px" mb={2} />
                  <Skeleton height="40px" mt={4} />
                </Box>
              ))}
            </SimpleGrid>
          ) : filteredRepos.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {filteredRepos.map((repo) => (
                <RepositoryCard key={repo._id} repo={repo} />
              ))}
            </SimpleGrid>
          ) : (
            <VStack spacing={4} p={5} borderWidth="1px" borderRadius="lg" align="center">
              <Text>No repositories found.</Text>
              <Button 
                leftIcon={<FiGithub />} 
                colorScheme="brand"
                onClick={handleSyncRepositories}
                isLoading={syncingRepos}
              >
                Sync GitHub Repositories
              </Button>
            </VStack>
          )}
        </Box>

        <Box>
          <Heading size="md" mb={4}>Recent Analyses</Heading>
          {loading ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {[1, 2].map((i) => (
                <Box key={i} p={4} shadow="sm" borderWidth="1px" borderRadius="md">
                  <Skeleton height="20px" width="60%" mb={3} />
                  <Skeleton height="14px" mb={2} />
                  <Skeleton height="30px" mt={3} />
                </Box>
              ))}
            </SimpleGrid>
          ) : analyses.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {analyses.slice(0, 4).map((analysis) => (
                <AnalysisCard key={analysis._id} analysis={analysis} />
              ))}
            </SimpleGrid>
          ) : (
            <Box p={5} borderWidth="1px" borderRadius="lg" textAlign="center">
              <Text>No recent analyses found. Analyze a repository to get started.</Text>
            </Box>
          )}
        </Box>
      </Stack>
    </Container>
  );
};

export default DashboardPage;
