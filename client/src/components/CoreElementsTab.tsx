import React, { useState } from 'react';
import { Box, Button, Text, useColorModeValue, Flex, IconButton, Tooltip } from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import axios from 'axios';

interface CoreElementsTabProps {
  repositoryUrl: string;
  onCopyToClipboard: (text: string, type: string) => void;
}

const CoreElementsTab: React.FC<CoreElementsTabProps> = ({ repositoryUrl, onCopyToClipboard }) => {
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await axios.post('/api/ai/core-elements', { repositoryUrl });
      setResult(response.data.elements);
    } catch (error: any) {
      console.error('Error extracting core elements:', error);
      setError(error.response?.data?.message || 'Failed to extract core elements');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Box p={4} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.800')}>
      <Text mb={4}>
        Extract the core algorithms and key elements from your codebase. 
        This feature identifies the most important parts of your code, helping you understand 
        the essential components and algorithmic patterns that drive your application.
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
          loadingText="Extracting elements..."
          onClick={handleGenerate}
          disabled={!repositoryUrl}
        >
          Extract Core Elements
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
              Extract Again
            </Button>
            <Tooltip label="Copy to clipboard">
              <IconButton
                aria-label="Copy core elements"
                icon={<FiCopy />}
                size="sm"
                onClick={() => onCopyToClipboard(result, 'Core Elements')}
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

export default CoreElementsTab;
