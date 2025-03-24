import React, { useState } from 'react';
import { Box, Button, Text, useColorModeValue, Flex, IconButton, Tooltip } from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import axios from 'axios';

interface IosAppTabProps {
  repositoryUrl: string;
  onCopyToClipboard: (text: string, type: string) => void;
}

const IosAppTab: React.FC<IosAppTabProps> = ({ repositoryUrl, onCopyToClipboard }) => {
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await axios.post('/api/ai/ios-app', { repositoryUrl });
      setResult(response.data.iosApp);
    } catch (error: any) {
      console.error('Error generating iOS app conversion:', error);
      setError(error.response?.data?.message || 'Failed to generate iOS app conversion');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Box p={4} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.800')}>
      <Text mb={4}>
        Convert your web application to an iOS app structure. This feature analyzes your web app's 
        architecture and generates a blueprint for transforming it into a native iOS application 
        using Swift and UIKit/SwiftUI.
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
          loadingText="Converting to iOS..."
          onClick={handleGenerate}
          disabled={!repositoryUrl}
        >
          Generate iOS App Conversion
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
              Generate Again
            </Button>
            <Tooltip label="Copy to clipboard">
              <IconButton
                aria-label="Copy iOS app conversion"
                icon={<FiCopy />}
                size="sm"
                onClick={() => onCopyToClipboard(result, 'iOS App Conversion')}
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

export default IosAppTab;
