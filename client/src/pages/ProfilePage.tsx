import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Stack,
  HStack,
  VStack,
  Avatar,
  Divider,
  useColorModeValue,
  FormControl,
  FormLabel,
  Input,
  Switch,
  SimpleGrid,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { FiGithub, FiMail, FiSave, FiSettings, FiStar } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// Mock user profile data
const mockUserProfile = {
  id: '123',
  username: 'johndoe',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatarUrl: 'https://avatars.githubusercontent.com/u/1234567',
  githubUrl: 'https://github.com/johndoe',
  bio: 'Full-stack developer passionate about React and Node.js',
  company: 'Acme Inc.',
  location: 'San Francisco, CA',
  favorites: [
    {
      id: '1',
      name: 'project-alpha',
      owner: 'johndoe',
      lastAnalyzed: '2025-03-15',
    },
    {
      id: '2',
      name: 'api-service',
      owner: 'johndoe',
      lastAnalyzed: '2025-03-10',
    },
  ],
  settings: {
    emailNotifications: true,
    darkMode: false,
    autoAnalyze: false,
    defaultPrivacy: 'private',
  },
};

const ProfilePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState(mockUserProfile);
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const handleProfileUpdate = () => {
    // In a real app, this would send the updated profile to the backend
    toast({
      title: 'Profile updated',
      description: 'Your profile has been successfully updated.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    setIsEditing(false);
  };

  const handleSettingChange = (setting: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value,
      }
    }));
  };

  return (
    <Container maxW="container.xl" py={5}>
      <Stack spacing={8}>
        <Box
          p={5}
          shadow="md"
          borderWidth="1px"
          borderRadius="lg"
          bg={useColorModeValue('white', 'gray.700')}
        >
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            align={{ base: 'center', md: 'flex-start' }}
            justify="space-between"
          >
            <HStack spacing={6} align="flex-start" mb={{ base: 4, md: 0 }}>
              <Avatar size="xl" src={profile.avatarUrl} name={profile.name} />
              <VStack align="flex-start" spacing={1}>
                <Heading size="lg">{profile.name}</Heading>
                <HStack>
                  <FiGithub />
                  <Text color="gray.600">{profile.username}</Text>
                </HStack>
                <HStack>
                  <FiMail />
                  <Text color="gray.600">{profile.email}</Text>
                </HStack>
                <Text mt={2}>{profile.bio}</Text>
              </VStack>
            </HStack>
            {!isEditing && (
              <Button 
                colorScheme="brand" 
                onClick={() => setIsEditing(true)}
                leftIcon={<FiSettings />}
              >
                Edit Profile
              </Button>
            )}
          </Flex>

          {isEditing && (
            <Box mt={6}>
              <Divider mb={6} />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input 
                    value={profile.name} 
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    value={profile.email} 
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Company</FormLabel>
                  <Input 
                    value={profile.company} 
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input 
                    value={profile.location} 
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                </FormControl>
                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel>Bio</FormLabel>
                  <Input 
                    value={profile.bio} 
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </FormControl>
                <HStack spacing={4} gridColumn={{ md: "span 2" }} justify="flex-end" mt={4}>
                  <Button onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button 
                    colorScheme="brand" 
                    leftIcon={<FiSave />}
                    onClick={handleProfileUpdate}
                  >
                    Save Changes
                  </Button>
                </HStack>
              </SimpleGrid>
            </Box>
          )}
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          <Box
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg={useColorModeValue('white', 'gray.700')}
          >
            <Heading size="md" mb={4}>Favorite Repositories</Heading>
            {profile.favorites.length === 0 ? (
              <Text color="gray.500">No favorite repositories yet.</Text>
            ) : (
              <VStack spacing={4} align="stretch">
                {profile.favorites.map((repo) => (
                  <Box 
                    key={repo.id} 
                    p={3} 
                    borderWidth="1px" 
                    borderRadius="md"
                    _hover={{
                      shadow: 'md',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <HStack justify="space-between">
                      <VStack align="flex-start">
                        <Text fontWeight="bold">{repo.owner}/{repo.name}</Text>
                        <Text fontSize="sm" color="gray.500">
                          Last analyzed: {repo.lastAnalyzed}
                        </Text>
                      </VStack>
                      <FiStar color="gold" />
                    </HStack>
                  </Box>
                ))}
              </VStack>
            )}
          </Box>

          <Box
            p={5}
            shadow="md"
            borderWidth="1px"
            borderRadius="lg"
            bg={useColorModeValue('white', 'gray.700')}
          >
            <Heading size="md" mb={4}>Settings</Heading>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="email-notifications" mb="0">
                  Email Notifications
                </FormLabel>
                <Switch 
                  id="email-notifications" 
                  isChecked={profile.settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="dark-mode" mb="0">
                  Dark Mode
                </FormLabel>
                <Switch 
                  id="dark-mode" 
                  isChecked={profile.settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="auto-analyze" mb="0">
                  Auto-analyze New Repositories
                </FormLabel>
                <Switch 
                  id="auto-analyze" 
                  isChecked={profile.settings.autoAnalyze}
                  onChange={(e) => handleSettingChange('autoAnalyze', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="default-privacy">Default Repository Privacy</FormLabel>
                <HStack spacing={4}>
                  <Badge 
                    colorScheme={profile.settings.defaultPrivacy === 'public' ? 'green' : 'gray'}
                    p={2}
                    cursor="pointer"
                    onClick={() => handleSettingChange('defaultPrivacy', 'public')}
                  >
                    Public
                  </Badge>
                  <Badge 
                    colorScheme={profile.settings.defaultPrivacy === 'private' ? 'red' : 'gray'}
                    p={2}
                    cursor="pointer"
                    onClick={() => handleSettingChange('defaultPrivacy', 'private')}
                  >
                    Private
                  </Badge>
                </HStack>
              </FormControl>
            </VStack>
          </Box>
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default ProfilePage;
