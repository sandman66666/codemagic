import React from 'react';
import {
  Box,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
  HStack,
  Badge,
  IconButton,
  Tooltip,
  useColorModeValue,
  Text
} from '@chakra-ui/react';
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
  AIComponents = {}
}) => {
  const { AiInsightsTab, CoreElementsTab, IosAppTab } = AIComponents;
  
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
                <Badge colorScheme="blue">
                  {selectedFiles.length} of {availableFiles.length} files
                </Badge>
              </HStack>
            )}
            
            <HStack justifyContent={{ base: "flex-start", sm: "flex-end" }} width={{ base: "100%", sm: "auto" }}>
              {showFileSelector && (
                <Tooltip label="Select files to display">
                  <IconButton
                    aria-label="File settings"
                    icon={<FiSettings />}
                    size="sm"
                    onClick={onFileSelectOpen}
                  />
                </Tooltip>
              )}
              
              <Tooltip label="Copy to clipboard">
                <IconButton
                  aria-label="Copy content"
                  icon={<FiCopy />}
                  size="sm"
                  onClick={() => onCopyToClipboard(getFilteredContent(), 'Content')}
                />
              </Tooltip>
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
            <Tooltip label="Copy to clipboard">
              <IconButton
                aria-label="Copy summary"
                icon={<FiCopy />}
                size="sm"
                onClick={() => onCopyToClipboard(summary || '', 'Summary')}
              />
            </Tooltip>
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
            <Tooltip label="Copy to clipboard">
              <IconButton
                aria-label="Copy file tree"
                icon={<FiCopy />}
                size="sm"
                onClick={() => onCopyToClipboard(fileTree || '', 'File Tree')}
              />
            </Tooltip>
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
