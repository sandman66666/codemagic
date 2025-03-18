import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthCallback Component
 * Handles the redirect from OAuth providers with the JWT token
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Extract token from URL query parameters
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Redirect to dashboard after token is stored
      navigate('/dashboard', { replace: true });
    } else {
      // If no token found, redirect to login
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);
  
  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }
  
  return (
    <Center minH="80vh">
      <VStack spacing={4}>
        <Spinner size="xl" thickness="4px" speed="0.65s" />
        <Text>Completing authentication...</Text>
      </VStack>
    </Center>
  );
};

export default AuthCallback;