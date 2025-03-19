import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

/**
 * AuthCallback Component
 * Handles the redirect from OAuth providers with the JWT token
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  
  useEffect(() => {
    const processAuthentication = async () => {
      // Extract token from URL query parameters
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      
      if (token) {
        try {
          // Store token in localStorage
          localStorage.setItem('token', token);
          
          // Fetch user data to ensure context is updated
          await axios.get('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          // Add a small delay to ensure context is updated
          setTimeout(() => {
            // Redirect to dashboard after token is stored and user data is fetched
            navigate('/dashboard', { replace: true });
            setIsProcessing(false);
          }, 500);
        } catch (error) {
          console.error('Error processing authentication:', error);
          navigate('/login', { replace: true });
          setIsProcessing(false);
        }
      } else {
        // If no token found, redirect to login
        navigate('/login', { replace: true });
        setIsProcessing(false);
      }
    };
    
    if (!isAuthenticated && isProcessing) {
      processAuthentication();
    }
  }, [location, navigate, isAuthenticated, isProcessing]);
  
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