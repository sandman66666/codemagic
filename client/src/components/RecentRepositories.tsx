import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Heading,
  Text,
  Link,
  List,
  ListItem,
  Badge,
  Flex,
  Spinner,
  Button,
  Icon,
  useColorModeValue,
  VStack,
  HStack,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Checkbox,
  Stack,
  Divider,
  Tag,
  TagLeftIcon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiGithub, FiStar, FiGitBranch, FiEye, FiCalendar, FiFileText, FiDatabase, FiCode } from 'react-icons/fi';
import RepositoryAnalysisView from './RepositoryAnalysisView';
import AiInsightsTab from './AiInsightsTab';
import CoreElementsTab from './CoreElementsTab';
import IosAppTab from './IosAppTab';
import useRepositoryAnalysis from '../hooks/useRepositoryAnalysis';

interface RecentRepository {
  _id: string;
  repositoryUrl: string;
  isPublic: boolean;
  createdAt: string;
  githubMetadata?: {
    fullName?: string;
    ownerName?: string;
    repoName?: string;
    stars?: number;
    forks?: number;
    description?: string;
    isPrivate?: boolean;
  };
  ingestData?: {
    content?: string;
    summary?: string;
    fileTree?: string;
  };
  analysis?: {
    fileTree?: string[];
  };
}

interface FullRepository extends RecentRepository {
  ingestData: {
    content: string;
    summary: string;
    fileTree: string;
  };
}

interface RecentRepositoriesProps {
  limit?: number;
}

const RecentRepositories: React.FC<RecentRepositoriesProps> = ({ limit = 5 }) => {
  const [repositories, setRepositories] = useState<RecentRepository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<FullRepository | null>(null);
  const [loadingRepoIds, setLoadingRepoIds] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

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
    content: selectedRepo?.ingestData?.content,
    summary: selectedRepo?.ingestData?.summary,
    fileTree: selectedRepo?.ingestData?.fileTree
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchRecentRepositories = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/users/recent-repositories?limit=${limit}`);
        setRepositories(response.data.repositories);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load recent repositories');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentRepositories();
  }, [limit]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        setIsAuthenticated(response.status === 200 && !!response.data);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getRepoName = (repo: RecentRepository) => {
    if (repo.githubMetadata?.fullName) {
      return repo.githubMetadata.fullName;
    }

    const match = repo.repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }

    return 'Repository';
  };

  const handleViewResults = async (repo: RecentRepository) => {
    try {
      setLoadingRepoIds(prev => [...prev, repo._id]);
      
      const response = await axios.get(`/api/analysis/ingested-repositories/${repo._id}`);
      if (response.data.success) {
        setSelectedRepo(response.data.repository as FullRepository);
        onOpen();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load repository data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to load repository data',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingRepoIds(prev => prev.filter(id => id !== repo._id));
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

  if (loading) {
    return (
      <Box textAlign="center" py={5}>
        <Spinner />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={5}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  if (repositories.length === 0) {
    return (
      <Box textAlign="center" py={5}>
        <Text>You haven't ingested any repositories yet.</Text>
        <Button 
          as={RouterLink} 
          to="/" 
          mt={4} 
          colorScheme="blue"
          leftIcon={<FiGithub />}
        >
          Analyze a Repository
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <HStack spacing={2} align="center">
          <Icon as={FiCode} color="blue.500" />
          <Heading size="md">Recently Analyzed Repositories</Heading>
        </HStack>
        
        <Button
          size="sm"
          colorScheme="blue"
          leftIcon={<Icon as={FiGithub} />}
          as={RouterLink}
          to="/"
        >
          Analyze New Repository
        </Button>
      </Flex>

      <List spacing={3}>
        {repositories.map((repo) => (
          <ListItem 
            key={repo._id} 
            p={0}
            borderWidth="1px" 
            borderRadius="md" 
            bg={bgColor}
            position="relative"
          >
            {/* Repository Type Badge */}
            <Badge 
              position="absolute" 
              top={2} 
              right={2}
              px={2}
              py={1}
              borderRadius="md"
              colorScheme={!repo.githubMetadata?.isPrivate ? "green" : "purple"}
            >
              {!repo.githubMetadata?.isPrivate ? "PUBLIC" : "PRIVATE"}
            </Badge>
            
            <Box p={4}>
              {/* Repository Name */}
              <HStack mb={3}>
                <Icon as={FiGithub} color="blue.400" />
                <Heading size="sm" isTruncated>
                  <Link href={repo.repositoryUrl} isExternal color="blue.500">
                    {getRepoName(repo)}
                  </Link>
                </Heading>
              </HStack>
              
              {/* Repository Description */}
              {repo.githubMetadata?.description && (
                <Text fontSize="sm" color="gray.500" noOfLines={2} mb={3}>
                  {repo.githubMetadata.description}
                </Text>
              )}
              
              <Divider my={2} />
              
              <Flex justify="space-between" align="center" mt={2} wrap="wrap">
                <HStack spacing={4} mb={[2, 0]}>
                  {/* Files Count */}
                  <HStack spacing={1}>
                    <Icon as={FiFileText} color="gray.500" />
                    <Text fontSize="sm">{6} files</Text>
                  </HStack>
                  
                  {/* Date */}
                  <HStack spacing={1}>
                    <Icon as={FiCalendar} color="gray.500" />
                    <Text fontSize="sm">{formatDate(repo.createdAt)}</Text>
                  </HStack>
                  
                  {/* Stars */}
                  {repo.githubMetadata?.stars !== undefined && (
                    <HStack spacing={1}>
                      <Icon as={FiStar} color="gray.500" />
                      <Text fontSize="sm">{repo.githubMetadata.stars}</Text>
                    </HStack>
                  )}
                  
                  {/* Forks */}
                  {repo.githubMetadata?.forks !== undefined && (
                    <HStack spacing={1}>
                      <Icon as={FiGitBranch} color="gray.500" />
                      <Text fontSize="sm">{repo.githubMetadata.forks}</Text>
                    </HStack>
                  )}
                </HStack>
                
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={() => handleViewResults(repo)}
                  isLoading={loadingRepoIds.includes(repo._id)}
                  leftIcon={<FiEye />}
                >
                  View Analysis
                </Button>
              </Flex>
            </Box>
          </ListItem>
        ))}
      </List>

      {/* Analysis Results Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxHeight="80vh">
          <ModalHeader>
            {selectedRepo && (
              <HStack>
                <Icon as={FiGithub} />
                <Text>{getRepoName(selectedRepo)}</Text>
                <Badge colorScheme={!selectedRepo.githubMetadata?.isPrivate ? "green" : "purple"}>
                  {!selectedRepo.githubMetadata?.isPrivate ? "Public" : "Private"}
                </Badge>
              </HStack>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedRepo ? (
              <RepositoryAnalysisView 
                content={selectedRepo.ingestData?.content}
                summary={selectedRepo.ingestData?.summary}
                fileTree={selectedRepo.ingestData?.fileTree}
                onCopyToClipboard={copyToClipboard}
                showFileSelector={true}
                selectedFiles={selectedFiles}
                availableFiles={availableFiles}
                onFileSelectOpen={onFileSelectOpen}
                getFilteredContent={getFilteredContent}
                showAllTabs={true}
                AIComponents={{
                  AiInsightsTab: <AiInsightsTab 
                                    repositoryUrl={selectedRepo.repositoryUrl} 
                                    onCopyToClipboard={copyToClipboard} 
                                  />,
                  CoreElementsTab: <CoreElementsTab 
                                     repositoryUrl={selectedRepo.repositoryUrl} 
                                     onCopyToClipboard={copyToClipboard} 
                                   />,
                  IosAppTab: <IosAppTab 
                               repositoryUrl={selectedRepo.repositoryUrl} 
                               onCopyToClipboard={copyToClipboard} 
                             />
                }}
              />
            ) : (
              <Box textAlign="center">
                <Spinner size="xl" />
                <Text mt={4}>Loading repository data...</Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button 
              leftIcon={<FiGithub />}
              mr={3} 
              as={Link}
              href={selectedRepo?.repositoryUrl}
              isExternal
            >
              View on GitHub
            </Button>
            <Button 
              onClick={() => {
                if (selectedRepo) {
                  window.location.href = `/?url=${encodeURIComponent(selectedRepo.repositoryUrl)}`;
                }
              }}
              colorScheme="blue"
              leftIcon={<FiEye />}
            >
              Re-Analyze
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* File Selection Drawer */}
      <Drawer
        isOpen={isFileSelectOpen}
        placement="right"
        onClose={onFileSelectClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Select Files to Display</DrawerHeader>
          
          <DrawerBody>
            <Checkbox
              isChecked={selectedFiles.length === availableFiles.length}
              onChange={toggleSelectAll}
              mb={4}
            >
              Select All ({availableFiles.length} files)
            </Checkbox>
            
            <Stack spacing={1}>
              {availableFiles.map((file) => (
                <Checkbox
                  key={file}
                  isChecked={selectedFiles.includes(file)}
                  onChange={() => toggleFileSelection(file)}
                >
                  {file}
                </Checkbox>
              ))}
            </Stack>
          </DrawerBody>
          
          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onFileSelectClose}>
              Close
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default RecentRepositories;
