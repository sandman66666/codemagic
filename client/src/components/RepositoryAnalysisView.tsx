import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  useColorModeValue,
  Spinner,
  Button,
  HStack,
  Center,
  useMediaQuery
} from '@chakra-ui/react';
import axios from 'axios';
import { FiCopy, FiSettings } from 'react-icons/fi';

interface RepositoryAnalysisViewProps {
  content?: string;
  summary?: string;
  fileTree?: string;
  onCopyToClipboard: (text: string, type: string) => void;
  showFileSelector?: boolean;
  selectedFiles?: string[];
  availableFiles?: string[];
  onFileSelectOpen?: () => void;
  getFilteredContent?: () => string;
  showAllTabs?: boolean;
  AIComponents?: {
    AiInsightsTab?: React.ReactNode;
    CoreElementsTab?: React.ReactNode;
    IosAppTab?: React.ReactNode;
  };
  repositoryUrl?: string;
}

const RepositoryAnalysisView: React.FC<RepositoryAnalysisViewProps> = ({
  content,
  summary,
  fileTree,
  onCopyToClipboard,
  showFileSelector = false,
  selectedFiles = [],
  availableFiles = [],
  onFileSelectOpen = () => {},
  getFilteredContent = () => content || '',
  showAllTabs = false,
  AIComponents = {},
  repositoryUrl
}) => {
  const { AiInsightsTab, CoreElementsTab, IosAppTab } = AIComponents;
  
  const [previousInsights, setPreviousInsights] = React.useState([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  
  React.useEffect(() => {
    if (showAllTabs && AiInsightsTab) {
      fetchInsightsHistory();
    }
  }, [showAllTabs, AiInsightsTab]);
  
  // Fetch insights history
  const fetchInsightsHistory = async () => {
    if (!repositoryUrl) {
      console.log("Cannot fetch insights history: repositoryUrl is undefined");
      return;
    }
    
    setLoadingHistory(true);
    try {
      const response = await axios.get('/api/ai/insights/history', {
        params: {
          repositoryUrl
        }
      });
      if (response.data && Array.isArray(response.data.insights)) {
        setPreviousInsights(response.data.insights);
      }
    } catch (error) {
      console.error('Error fetching insights history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const PreviousAnalyses = () => {
    if (loadingHistory) {
      return (
        <Center p={4}>
          <Text>Loading analysis history...</Text>
        </Center>
      );
    }
    
    if (previousInsights.length === 0) {
      return null;
    }
    
    return (
      <Box mb={4} p={4} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
        <HStack mb={3}>
          <Text fontSize="sm" fontWeight="bold">Previous Analyses</Text>
          <Text fontSize="sm" color={useColorModeValue('gray.600', 'gray.400')} ml={2}>
            ({previousInsights.length} found)
          </Text>
        </HStack>
        
        <Flex direction="column">
          {previousInsights.map((insight, index) => (
            <Box key={index} p={2} borderRadius="md" bg={useColorModeValue('white', 'gray.800')} mb={2}>
              <Text fontSize="sm" fontWeight="bold">Analysis {index + 1}</Text>
            </Box>
          ))}
        </Flex>
      </Box>
    );
  };

  return (
    <Tabs colorScheme="brand" variant="enclosed" isFitted size={{ base: "sm", md: "md" }}>
      <TabList overflowX={{ base: "auto", md: "visible" }} flexWrap={{ base: "nowrap", md: "wrap" }}>
        <Tab minW={{ base: "100px", md: "auto" }}>Content</Tab>
        <Tab minW={{ base: "100px", md: "auto" }}>Summary</Tab>
        <Tab minW={{ base: "100px", md: "auto" }}>File Tree</Tab>
        {showAllTabs && AiInsightsTab && (
          <Tab minW={{ base: "100px", md: "auto" }}>AI Insights</Tab>
        )}
        {showAllTabs && CoreElementsTab && (
          <Tab minW={{ base: "100px", md: "auto" }}>Core Elements</Tab>
        )}
        {showAllTabs && IosAppTab && (
          <Tab minW={{ base: "100px", md: "auto" }}>iOS App</Tab>
        )}
      </TabList>
      
      <TabPanels>
        {/* Content Tab */}
        <TabPanel p={{ base: 2, md: 4 }}>
          <Flex justify="space-between" mb={2} direction={{ base: "column", sm: "row" }} gap={2}>
            {showFileSelector && (
              <HStack>
                <Text colorScheme="blue">
                  {selectedFiles.length} of {availableFiles.length} files
                </Text>
              </HStack>
            )}
            
            <HStack justifyContent={{ base: "flex-start", sm: "flex-end" }} width={{ base: "100%", sm: "auto" }}>
              {showFileSelector && (
                <Button
                  aria-label="File settings"
                  size="sm"
                  onClick={onFileSelectOpen}
                >
                  <FiSettings />
                </Button>
              )}
              
              <Button
                aria-label="Copy content"
                size="sm"
                onClick={() => onCopyToClipboard(getFilteredContent(), 'Content')}
              >
                <FiCopy />
              </Button>
            </HStack>
          </Flex>
          <Box
            p={{ base: 2, md: 4 }}
            borderRadius="md"
            bg={useColorModeValue('gray.50', 'gray.800')}
            overflowY="auto"
            maxHeight={{ base: "300px", md: "500px" }}
            whiteSpace="pre-wrap"
            fontFamily="monospace"
            fontSize={{ base: "xs", md: "sm" }}
          >
            {getFilteredContent()}
          </Box>
        </TabPanel>
        
        {/* Summary Tab */}
        <TabPanel p={{ base: 2, md: 4 }}>
          <Flex justify="flex-end" mb={2}>
            <Button
              aria-label="Copy summary"
              size="sm"
              onClick={() => onCopyToClipboard(summary || '', 'Summary')}
            >
              <FiCopy />
            </Button>
          </Flex>
          <Box
            p={{ base: 2, md: 4 }}
            borderRadius="md"
            bg={useColorModeValue('gray.50', 'gray.800')}
            overflowY="auto"
            maxHeight={{ base: "300px", md: "500px" }}
            whiteSpace="pre-wrap"
            fontSize={{ base: "xs", md: "sm" }}
          >
            {summary || ''}
          </Box>
        </TabPanel>
        
        {/* File Tree Tab */}
        <TabPanel p={{ base: 2, md: 4 }}>
          <Flex justify="flex-end" mb={2}>
            <Button
              aria-label="Copy file tree"
              size="sm"
              onClick={() => onCopyToClipboard(fileTree || '', 'File Tree')}
            >
              <FiCopy />
            </Button>
          </Flex>
          <Box 
            p={{ base: 2, md: 4 }}
            borderRadius="md"
            bg={useColorModeValue('gray.50', 'gray.800')}
            overflowY="auto"
            maxHeight={{ base: "300px", md: "500px" }}
            fontSize={{ base: "xs", md: "sm" }}
            whiteSpace="pre-wrap"
            fontFamily="monospace"
          >
            {fileTree || ''}
          </Box>
        </TabPanel>
        
        {/* AI Insights Tab */}
        {showAllTabs && AiInsightsTab && (
          <TabPanel>
            <PreviousAnalyses />
            {AiInsightsTab}
          </TabPanel>
        )}
        
        {/* Core Elements Tab */}
        {showAllTabs && CoreElementsTab && (
          <TabPanel>
            {CoreElementsTab}
          </TabPanel>
        )}
        
        {/* iOS App Tab */}
        {showAllTabs && IosAppTab && (
          <TabPanel>
            {IosAppTab}
          </TabPanel>
        )}
      </TabPanels>
    </Tabs>
  );
};

export default RepositoryAnalysisView;
