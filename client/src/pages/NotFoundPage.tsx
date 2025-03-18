import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiHome } from 'react-icons/fi';

const NotFoundPage: React.FC = () => {
  return (
    <Flex
      minH={'80vh'}
      align={'center'}
      justify={'center'}
      py={10}
      px={6}
    >
      <VStack spacing={8} textAlign="center">
        <Heading
          display="inline-block"
          as="h1"
          size="4xl"
          color={useColorModeValue('brand.500', 'brand.300')}
        >
          404
        </Heading>
        <VStack>
          <Heading as="h2" size="xl">
            Page Not Found
          </Heading>
          <Text color={'gray.500'}>
            The page you're looking for doesn't seem to exist.
          </Text>
        </VStack>
        <Button
          as={RouterLink}
          to="/"
          colorScheme="brand"
          leftIcon={<FiHome />}
          size="lg"
        >
          Return Home
        </Button>
      </VStack>
    </Flex>
  );
};

export default NotFoundPage;
