import React from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Stack,
  Text,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiGithub } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Flex
      minH={'80vh'}
      align={'center'}
      justify={'center'}
    >
      <Stack spacing={8} mx={'auto'} maxW={'lg'} py={12} px={6}>
        <Stack align={'center'}>
          <Heading fontSize={'4xl'}>Sign in to CodeInsight</Heading>
          <Text fontSize={'lg'} color={'gray.600'}>
            to analyze your repositories with AI
          </Text>
        </Stack>
        <Box
          rounded={'lg'}
          bg={useColorModeValue('white', 'gray.700')}
          boxShadow={'lg'}
          p={8}
        >
          <Stack spacing={4}>
            <Button
              bg={'gray.800'}
              color={'white'}
              _hover={{
                bg: 'gray.700',
              }}
              onClick={login}
              leftIcon={<Icon as={FiGithub} />}
              size="lg"
            >
              Sign in with GitHub
            </Button>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              We'll only request read access to your repositories to provide analysis.
              We never store your code.
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
};

export default LoginPage;
