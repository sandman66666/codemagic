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
  Stack
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiGithub, FiClock, FiStar, FiGitBranch, FiEye, FiDownload } from 'react-icons/fi';
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
  };
  ingestData?: {
    content?: string;
    summary?: string;
    fileTree?: string;
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
  const [loadingRepo, setLoadingRepo] = useState<boolean>(false);

  // Use the improved repository analysis hook
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
      setLoadingRepo(true);
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
      setLoadingRepo(false);
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
      <Heading size="md" mb={4}>Recently Analyzed Repositories</Heading>
      <List spacing={3}>
        {repositories.map((repo) => (
          <ListItem 
            key={repo._id} 
            p={4} 
            borderWidth="1px" 
            borderRadius="md" 
            bg={bgColor} 
            borderColor={borderColor}
          >
            <VStack align="start" spacing={2}>
              <HStack spacing={2}>
                <Icon as={FiGithub} />
                <Heading size="sm" isTruncated maxW="100%">
                  <Link 
                    href={repo.repositoryUrl}
                    isExternal
                    color="blue.500"
                  >
                    {getRepoName(repo)}
                  </Link>
                </Heading>
                <Badge colorScheme={repo.isPublic ? "green" : "purple"}>
                  {repo.isPublic ? "Public" : "Private"}
                </Badge>
              </HStack>

              {repo.githubMetadata?.description && (
                <Text fontSize="sm" color="gray.500" noOfLines={2}>
                  {repo.githubMetadata.description}
                </Text>
              )}

              <Flex wrap="wrap" gap={4} fontSize="sm" color="gray.500">
                <Tooltip label="Analyzed on">
                  <HStack>
                    <Icon as={FiClock} />
                    <Text>{formatDate(repo.createdAt)}</Text>
                  </HStack>
                </Tooltip>

                {repo.githubMetadata?.stars !== undefined && (
                  <Tooltip label="Stars">
                    <HStack>
                      <Icon as={FiStar} />
                      <Text>{repo.githubMetadata.stars}</Text>
                    </HStack>
                  </Tooltip>
                )}

                {repo.githubMetadata?.forks !== undefined && (
                  <Tooltip label="Forks">
                    <HStack>
                      <Icon as={FiGitBranch} />
                      <Text>{repo.githubMetadata.forks}</Text>
                    </HStack>
                  </Tooltip>
                )}

                <Button 
                  onClick={() => handleViewResults(repo)}
                  size="xs"
                  colorScheme="blue"
                  leftIcon={<FiEye />}
                  ml="auto"
                  isLoading={loadingRepo}
                >
                  View Results
                </Button>
              </Flex>
            </VStack>
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
                <Badge colorScheme={selectedRepo.isPublic ? "green" : "purple"}>
                  {selectedRepo.isPublic ? "Public" : "Private"}
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
              leftIcon={<FiDownload />}
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
