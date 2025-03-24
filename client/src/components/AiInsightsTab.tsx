import React, { useState } from 'react';
import { Box, Button, Text, useColorModeValue, Flex, IconButton, Tooltip } from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import axios from 'axios';

interface AiInsightsTabProps {
  repositoryUrl: string;
  onCopyToClipboard: (text: string, type: string) => void;
}

const AiInsightsTab: React.FC<AiInsightsTabProps> = ({ repositoryUrl, onCopyToClipboard }) => {
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await axios.post('/api/ai/insights', { repositoryUrl });
      setResult(response.data.insights);
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      setError(error.response?.data?.message || 'Failed to generate AI insights');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Box p={4} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.800')}>
      <Text mb={4}>
        Analyze your code with Claude AI to get deeper insights about architecture, patterns, and potential improvements.
        Our AI will examine your codebase and provide valuable feedback to help you understand and enhance your code.
      </Text>
      
      {error && (
        <Box mb={4} p={3} bg="red.50" color="red.500" borderRadius="md">
          {error}
        </Box>
      )}
      
      {!result ? (
        <Button 
          colorScheme="brand" 
          isLoading={isGenerating}
          loadingText="Analyzing code..."
          onClick={handleGenerate}
          disabled={!repositoryUrl}
        >
          Generate AI Insights
        </Button>
      ) : (
        <>
          <Flex justify="space-between" mb={2}>
            <Button 
              size="sm" 
              colorScheme="brand" 
              variant="outline"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              Generate New Insights
            </Button>
            <Tooltip label="Copy to clipboard">
              <IconButton
                aria-label="Copy AI insights"
                icon={<FiCopy />}
                size="sm"
                onClick={() => onCopyToClipboard(result, 'AI Insights')}
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
            {result}
          </Box>
        </>
      )}
    </Box>
  );
};

export default AiInsightsTab;
