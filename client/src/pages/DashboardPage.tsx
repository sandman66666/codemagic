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
      p={{ base: 4, md: 5 }}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      bg={useColorModeValue('white', 'gray.700')}
      _hover={{ shadow: 'lg', transform: 'translateY(-2px)', transition: 'all 0.2s' }}
    >
      <HStack justify="space-between" mb={2} flexWrap={{ base: "wrap", sm: "nowrap" }} gap={2}>
        <HStack>
          <FiGithub />
          <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} noOfLines={1}>
            {repo.name}
          </Text>
        </HStack>
        <Badge colorScheme={repo.isPrivate ? 'red' : 'green'}>
          {repo.isPrivate ? 'Private' : 'Public'}
        </Badge>
      </HStack>
      
      <Text color="gray.600" noOfLines={2} mb={4} fontSize={{ base: "sm", md: "md" }}>
        {repo.description}
      </Text>
      
      <HStack justify="space-between" flexWrap={{ base: "wrap", md: "nowrap" }} gap={2}>
        <HStack>
          <Avatar size="xs" src={repo.owner?.avatarUrl || ''} />
          <Text fontSize="sm" noOfLines={1}>{repo.fullName?.split('/')[0] || ''}</Text>
        </HStack>
        <HStack spacing={{ base: 2, md: 4 }} flexWrap="wrap">
          <HStack>
            <FiStar />
            <Text fontSize={{ base: "xs", md: "sm" }}>{repo.stars}</Text>
          </HStack>
          <HStack>
            <FiCode />
            <Text fontSize={{ base: "xs", md: "sm" }}>{repo.language}</Text>
          </HStack>
          <HStack>
            <FiClock />
            <Text fontSize={{ base: "xs", md: "sm" }}>{new Date(repo.updatedAt).toLocaleDateString()}</Text>
          </HStack>
        </HStack>
      </HStack>
      
      <Divider my={4} />
      
      <Button
        as={RouterLink}
        to={`/repository/${repo._id}`}
        colorScheme="brand"
        size={{ base: "xs", md: "sm" }}
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
      p={{ base: 3, md: 4 }}
      shadow="sm"
      borderWidth="1px"
      borderRadius="md"
      bg={useColorModeValue('white', 'gray.700')}
    >
      <HStack justify="space-between" mb={2} flexWrap={{ base: "wrap", sm: "nowrap" }} gap={1}>
        <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }} noOfLines={1}>
          {analysis.repository?.name || 'Repository'}
        </Text>
        <Badge colorScheme={analysis.status === 'completed' ? 'green' : 'yellow'}>
          {analysis.status}
        </Badge>
      </HStack>
      <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600" mb={2} noOfLines={{ base: 2, md: 3 }}>
        {analysis.summary?.overview || 'Analysis in progress...'}
      </Text>
      <HStack justify="space-between" flexWrap={{ base: "wrap", sm: "nowrap" }} gap={2}>
        <Text fontSize={{ base: "2xs", md: "xs" }} color="gray.500">
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
    <Container maxW={{ base: "95%", sm: "90%", md: "90%", lg: "container.xl" }} py={{ base: 3, md: 5 }}>
      <Stack spacing={{ base: 5, md: 8 }}>
        <Flex 
          justify="space-between" 
          align={{ base: "flex-start", sm: "center" }} 
          flexDirection={{ base: "column", sm: "row" }}
          gap={{ base: 2, sm: 0 }}
        >
          <Heading size={{ base: "md", md: "lg" }}>Dashboard</Heading>
          <Text color="gray.600" fontSize={{ base: "sm", md: "md" }}>
            Welcome back, {user?.username || 'User'}
          </Text>
        </Flex>

        <Box>
          <Flex 
            justify="space-between" 
            align={{ base: "flex-start", sm: "center" }} 
            mb={4}
            flexDirection={{ base: "column", sm: "row" }}
            gap={{ base: 2, sm: 0 }}
          >
            <Heading size={{ base: "sm", md: "md" }}>Your Repositories</Heading>
            <Button 
              leftIcon={<FiRefreshCw />} 
              colorScheme="brand" 
              size={{ base: "xs", md: "sm" }}
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
              size={{ base: "sm", md: "md" }}
            />
          </InputGroup>
          
          {loading ? (
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 3, md: 6 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} p={{ base: 4, md: 5 }} shadow="md" borderWidth="1px" borderRadius="lg">
                  <Skeleton height="24px" width="60%" mb={4} />
                  <Skeleton height="16px" mb={2} />
                  <Skeleton height="16px" mb={4} />
                  <Skeleton height="24px" mb={2} />
                  <Skeleton height="40px" mt={4} />
                </Box>
              ))}
            </SimpleGrid>
          ) : filteredRepos.length > 0 ? (
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 3, md: 6 }}>
              {filteredRepos.map((repo) => (
                <RepositoryCard key={repo._id} repo={repo} />
              ))}
            </SimpleGrid>
          ) : (
            <VStack spacing={4} p={{ base: 3, md: 5 }} borderWidth="1px" borderRadius="lg" align="center">
              <Text fontSize={{ base: "sm", md: "md" }}>No repositories found.</Text>
              <Button 
                leftIcon={<FiGithub />} 
                colorScheme="brand"
                onClick={handleSyncRepositories}
                isLoading={syncingRepos}
                size={{ base: "xs", md: "sm" }}
              >
                Sync GitHub Repositories
              </Button>
            </VStack>
          )}
        </Box>

        <Box>
          <Heading size={{ base: "sm", md: "md" }} mb={4}>Recent Analyses</Heading>
          {loading ? (
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={{ base: 3, md: 4 }}>
              {[1, 2].map((i) => (
                <Box key={i} p={{ base: 3, md: 4 }} shadow="sm" borderWidth="1px" borderRadius="md">
                  <Skeleton height="20px" width="60%" mb={3} />
                  <Skeleton height="14px" mb={2} />
                  <Skeleton height="30px" mt={3} />
                </Box>
              ))}
            </SimpleGrid>
          ) : analyses.length > 0 ? (
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={{ base: 3, md: 4 }}>
              {analyses.slice(0, 4).map((analysis) => (
                <AnalysisCard key={analysis._id} analysis={analysis} />
              ))}
            </SimpleGrid>
          ) : (
            <Box p={{ base: 3, md: 5 }} borderWidth="1px" borderRadius="lg" textAlign="center">
              <Text fontSize={{ base: "sm", md: "md" }}>No recent analyses found. Analyze a repository to get started.</Text>
            </Box>
          )}
        </Box>
      </Stack>
    </Container>
  );
};

export default DashboardPage;
