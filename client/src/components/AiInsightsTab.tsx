import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Text, 
  useColorModeValue, 
  Flex, 
  IconButton, 
  Tooltip, 
  Heading, 
  VStack, 
  HStack, 
  Skeleton,
  Icon,
  Progress,
  Alert,
  AlertIcon,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  SimpleGrid,
  List,
  ListItem,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { 
  FiCopy, 
  FiRefreshCw, 
  FiGithub, 
  FiCode, 
  FiLayers, 
  FiGrid,
  FiCheckCircle,
  FiTool,
  FiList,
  FiFileText,
  FiExternalLink,
  FiShield,
  FiClock,
  FiCalendar,
  FiInfo,
  FiZap,
  FiClipboard
} from 'react-icons/fi';
import axios from 'axios';

interface AiInsightsTabProps {
  repositoryUrl: string;
  onCopyToClipboard: (text: string, type: string) => void;
}

interface AIInsight {
  _id: string;
  insights: string;
  createdAt: string;
  repositoryUrl: string;
  userId: string;
}

const parseInsights = (markdown: string) => {
  if (!markdown) return [];

  // Define a regex to find sections with markdown headers (## or ###)
  const sectionRegex = /(#{2,3})\s+([^\n]+)\n([\s\S]*?)(?=\n#{2,3}\s+|$)/g;
  const parsedSections = [];
  
  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const title = match[2].trim(); // The section title
    
    // Clean the section content
    let content = match[3].trim();
    
    // Remove any additional markdown formatting
    content = content.replace(/^#{1,5}\s+/gm, ''); // Remove any # at start of lines
    
    // Determine the icon based on the section title (case insensitive)
    let icon;
    const titleLower = title.toLowerCase();
    if (titleLower.includes('overview')) icon = FiFileText;
    else if (titleLower.includes('architecture')) icon = FiLayers;
    else if (titleLower.includes('patterns')) icon = FiGrid;
    else if (titleLower.includes('quality')) icon = FiCheckCircle;
    else if (titleLower.includes('improvement')) icon = FiTool;
    else if (titleLower.includes('practice')) icon = FiList;
    else if (titleLower.includes('security')) icon = FiShield;
    else icon = FiCode;
    
    parsedSections.push({
      level,
      title: title.replace(/^\d+\.\s*/, ''), // Remove any leading numbers
      content,
      icon
    });
  }
  
  return parsedSections;
};

const AiInsightsTab: React.FC<AiInsightsTabProps> = ({ repositoryUrl, onCopyToClipboard }) => {
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedSections, setParsedSections] = useState<any[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isCached, setIsCached] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [previousInsights, setPreviousInsights] = useState<AIInsight[]>([]);
  const [loadingPreviousInsights, setLoadingPreviousInsights] = useState(false);
  const [currentInsightId, setCurrentInsightId] = useState<string | null>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const sectionBgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const headingColor = useColorModeValue('gray.800', 'white');
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBgColor = useColorModeValue('gray.100', 'gray.600');
  
  const repoName = repositoryUrl.split('/').slice(-2).join('/');

  // Check for existing insights when component mounts or repository changes
  useEffect(() => {
    if (repositoryUrl) {
      fetchPreviousInsights();
    }
  }, [repositoryUrl]);

  // Parse the markdown whenever the result changes
  useEffect(() => {
    if (result) {
      const sections = parseInsights(result);
      setParsedSections(sections);
    }
  }, [result]);

  // Simulate analysis progress
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          const newProgress = prev + (Math.random() * 5);
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 300);
      
      return () => {
        clearInterval(interval);
        setCurrentProgress(0);
      };
    }
  }, [isGenerating]);

  // Format a date as relative time (e.g., "2 days ago")
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    
    // For older dates, use the date format
    return date.toLocaleDateString();
  };

  // Format a standard date and time
  const formatDateTime = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString(undefined, options);
  };

  // Fetch all previous insights for this repository
  const fetchPreviousInsights = async () => {
    try {
      setLoadingPreviousInsights(true);
      console.log("Fetching insights history for:", repositoryUrl);
      
      // Fetch previous insights from the API
      const response = await axios.get(`/api/ai/insights/history?repositoryUrl=${encodeURIComponent(repositoryUrl)}`);
      console.log("Response from history endpoint:", response.data);
      
      if (response.data && Array.isArray(response.data.insights)) {
        console.log("Setting previous insights:", response.data.insights.length, "items");
        setPreviousInsights(response.data.insights);
        
        // If there are insights, load the most recent one
        if (response.data.insights.length > 0) {
          const mostRecent = response.data.insights[0];
          console.log("Loading most recent insight:", mostRecent._id);
          loadInsight(mostRecent);
        } else {
          console.log("No previous insights found");
        }
      } else {
        console.warn("Unexpected response format:", response.data);
      }
    } catch (error) {
      console.error('Error fetching previous insights:', error);
      setError('Failed to load previous analyses');
    } finally {
      setLoadingPreviousInsights(false);
    }
  };
  
  // Load a specific insight
  const loadInsight = (insight: AIInsight) => {
    setResult(insight.insights);
    setCreatedAt(new Date(insight.createdAt));
    setIsCached(true);
    setCurrentInsightId(insight._id);
    
    // Parse the insights text
    const sections = parseInsights(insight.insights);
    setParsedSections(sections);
  };
  
  const handleGenerate = async (forceRegenerate = false) => {
    setIsGenerating(true);
    setError(null);
    try {
      // Make the API call to generate new insights
      const response = await axios.post('/api/ai/insights', { 
        repositoryUrl,
        forceRegenerate 
      });
      
      setResult(response.data.insights);
      setIsCached(response.data.cached === true);
      setCreatedAt(response.data.createdAt ? new Date(response.data.createdAt) : null);
      setCurrentInsightId(response.data._id || null);
      
      // Refresh the list of previous insights
      fetchPreviousInsights();
      
      // Set to 100% when complete
      setCurrentProgress(100);
      
      // After a short delay, reset the progress
      setTimeout(() => setCurrentProgress(0), 500);
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      // Extract the specific error message from the API response when possible
      const errorMessage = error.response?.data?.message || 
                          'Failed to generate AI insights. Please try again later.';
      
      setError(errorMessage);
      setResult(null); // Clear any previous results since analysis failed
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Helper to format code blocks in the content
  const formatContent = (content: string) => {
    // Split by lines and render
    return content.split('\n').map((line, i) => (
      <Text key={i} whiteSpace="pre-wrap" mb={1}>
        {line}
      </Text>
    ));
  };
  
  return (
    <Box p={5} borderRadius="lg" bg={bgColor} boxShadow="sm">
      {/* Header section */}
      <Flex 
        direction="column" 
        align="flex-start" 
        mb={6} 
        p={5} 
        borderRadius="md" 
        bg={useColorModeValue('blue.50', 'blue.900')}
        border="1px solid"
        borderColor={useColorModeValue('blue.100', 'blue.700')}
      >
        <HStack spacing={2} mb={1}>
          <Icon as={FiCode} color={accentColor} boxSize="20px" />
          <Heading size="md" color={headingColor}>AI-Powered Code Analysis</Heading>
          
          {isCached && createdAt && (
            <Badge colorScheme="green" ml={2} variant="subtle" px={2} py={1} borderRadius="full">
              <HStack spacing={1}>
                <Icon as={FiClock} boxSize="12px" />
                <Text fontSize="xs">Generated {formatRelativeTime(createdAt)}</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
        
        <Text fontSize="md" color={subtleTextColor} mb={3}>
          Analyze your code with Claude AI to get deeper insights about architecture, patterns, and potential improvements.
          Our AI will examine your codebase and provide valuable feedback to help you understand and enhance your code.
        </Text>
        
        {repositoryUrl && (
          <HStack bg={useColorModeValue('white', 'gray.700')} py={1} px={3} borderRadius="full" fontSize="sm">
            <Icon as={FiGithub} />
            <Text fontWeight="medium">{repoName}</Text>
          </HStack>
        )}
      </Flex>
      
      {/* Previous Analyses History Table */}
      {previousInsights.length > 0 && (
        <Box mb={6} overflowX="auto">
          <HStack mb={3}>
            <Icon as={FiCalendar} color={accentColor} boxSize="18px" />
            <Heading size="sm">Previous Analysis History</Heading>
          </HStack>
          
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Date & Time</Th>
                <Th>Relative Time</Th>
                <Th textAlign="center">Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {previousInsights.map((insight) => {
                const date = new Date(insight.createdAt);
                const isSelected = currentInsightId === insight._id;
                
                return (
                  <Tr 
                    key={insight._id} 
                    cursor="pointer" 
                    onClick={() => loadInsight(insight)}
                    bg={isSelected ? useColorModeValue('blue.50', 'blue.900') : 'transparent'}
                    _hover={{ bg: isSelected ? undefined : hoverBgColor }}
                    fontWeight={isSelected ? "medium" : "normal"}
                  >
                    <Td>
                      <HStack>
                        <Icon as={FiClock} color={subtleTextColor} boxSize="14px" />
                        <Text>{formatDateTime(date)}</Text>
                      </HStack>
                    </Td>
                    <Td color={subtleTextColor}>
                      {formatRelativeTime(date)}
                    </Td>
                    <Td textAlign="center">
                      {isSelected && (
                        <Badge colorScheme="green">Current</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}
      
      {/* Error message */}
      {error && (
        <Alert status="error" mb={6} borderRadius="md" variant="left-accent">
          <AlertIcon boxSize="20px" />
          <Box>
            <Text fontWeight="bold">Analysis Failed</Text>
            <Text>{error}</Text>
            <Text mt={2} fontSize="sm">
              Please try again or contact support if the problem persists.
            </Text>
          </Box>
        </Alert>
      )}
      
      {/* Generate new analysis or show results */}
      {!result ? (
        <VStack spacing={4} align="stretch">
          {isGenerating && (
            <>
              <Box p={4} borderRadius="md" border="1px dashed" borderColor={borderColor}>
                <HStack mb={3}>
                  <Skeleton height="20px" width="200px" />
                </HStack>
                <Skeleton height="15px" mb={2} />
                <Skeleton height="15px" mb={2} width="90%" />
                <Skeleton height="15px" mb={4} width="80%" />
                
                <HStack mb={3} mt={6}>
                  <Skeleton height="20px" width="180px" />
                </HStack>
                <Skeleton height="15px" mb={2} />
                <Skeleton height="15px" mb={2} width="95%" />
              </Box>
              
              <Box>
                <Text mb={2} fontSize="sm" color={subtleTextColor}>
                  {isCached ? 'Loading cached analysis...' : 'Analyzing repository structure...'}
                </Text>
                <Progress 
                  value={currentProgress} 
                  size="sm" 
                  colorScheme="blue" 
                  borderRadius="full" 
                  hasStripe 
                  isAnimated
                />
              </Box>
            </>
          )}
          
          <Button 
            leftIcon={<FiCode />}
            colorScheme="blue" 
            isLoading={isGenerating}
            loadingText="Analyzing code..."
            onClick={() => handleGenerate(false)}
            disabled={!repositoryUrl}
            size="lg"
            boxShadow="md"
            _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
            transition="all 0.2s"
          >
            Generate AI Insights
          </Button>
        </VStack>
      ) : (
        <VStack spacing={6} align="stretch">
          <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
            <Button 
              size="md" 
              colorScheme="blue" 
              variant="outline"
              leftIcon={<FiRefreshCw />}
              onClick={() => handleGenerate(true)}
              isLoading={isGenerating}
              loadingText="Regenerating..."
            >
              Generate New Analysis
            </Button>
            
            <HStack>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="blue"
                rightIcon={<FiExternalLink />}
                as="a"
                href={`https://github.com/${repoName}`} 
                target="_blank"
              >
                View on GitHub
              </Button>
              <Tooltip label="Copy all insights to clipboard">
                <IconButton
                  aria-label="Copy AI insights"
                  icon={<FiCopy />}
                  size="md"
                  variant="ghost"
                  onClick={() => onCopyToClipboard(result, 'AI Insights')}
                />
              </Tooltip>
            </HStack>
          </Flex>
          
          {/* Results display - using Accordion for collapsible sections */}
          <Accordion allowToggle defaultIndex={[0]} borderColor="transparent">
            {parsedSections.map((section, index) => (
              <AccordionItem 
                key={index}
                mb={3}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="md"
                bg={sectionBgColor}
                overflow="hidden"
              >
                <AccordionButton py={3} px={4} _hover={{ bg: useColorModeValue('blue.50', 'blue.900') }}>
                  <HStack flex="1" spacing={3} textAlign="left">
                    <Icon 
                      as={section.icon} 
                      color={accentColor} 
                      boxSize="18px" 
                    />
                    <Heading 
                      size={section.level === 2 ? "md" : "sm"} 
                      color={headingColor}
                    >
                      {section.title}
                    </Heading>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                
                <AccordionPanel pb={4} pt={2} pl={10} pr={4} fontSize="sm" color={subtleTextColor}>
                  {formatContent(section.content)}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </VStack>
      )}
    </Box>
  );
};

export default AiInsightsTab;
