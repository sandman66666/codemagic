import React, { useState, useEffect } from 'react';
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
  Skeleton,
  useToast,
} from '@chakra-ui/react';
import { FiGithub, FiMail, FiSave, FiSettings, FiStar } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { userApi, repositoryApi } from '../services/api';

const ProfilePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      try {
        // Fetch user profile
        const profileResponse = await userApi.getUserProfile();
        setProfile(profileResponse.data);
        
        // Fetch favorite repositories
        const favoritesResponse = await repositoryApi.getFavoriteRepositories();
        setFavorites(favoritesResponse.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          title: 'Error loading profile',
          description: 'There was an error loading your profile data.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, toast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const handleProfileUpdate = async () => {
    try {
      await userApi.updateProfile(profile);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update failed',
        description: 'There was an error updating your profile.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSettingChange = async (setting: string, value: any) => {
    try {
      const updatedSettings = {
        ...profile.settings,
        [setting]: value
      };
      
      await userApi.updateUserSettings(updatedSettings);
      
      setProfile((prev: any) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [setting]: value,
        }
      }));
      
      toast({
        title: 'Settings updated',
        description: 'Your settings have been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Update failed',
        description: 'There was an error updating your settings.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
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
            <Flex direction={{ base: 'column', md: 'row' }} align="flex-start">
              <Skeleton height="100px" width="100px" borderRadius="full" mr={6} />
              <VStack align="flex-start" spacing={3} flex={1}>
                <Skeleton height="30px" width="200px" />
                <Skeleton height="20px" width="150px" />
                <Skeleton height="20px" width="200px" />
              </VStack>
            </Flex>
          </Box>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
            <Skeleton height="200px" />
            <Skeleton height="200px" />
          </SimpleGrid>
        </Stack>
      </Container>
    );
  }

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
              <Avatar size="xl" src={profile?.avatarUrl} name={profile?.name} />
              <VStack align="flex-start" spacing={1}>
                <Heading size="lg">{profile?.name}</Heading>
                <HStack>
                  <FiGithub />
                  <Text color="gray.600">{profile?.username}</Text>
                </HStack>
                <HStack>
                  <FiMail />
                  <Text color="gray.600">{profile?.email}</Text>
                </HStack>
                <Text mt={2}>{profile?.bio}</Text>
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
                    value={profile?.name || ''} 
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    value={profile?.email || ''} 
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Company</FormLabel>
                  <Input 
                    value={profile?.company || ''} 
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Location</FormLabel>
                  <Input 
                    value={profile?.location || ''} 
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                </FormControl>
                <FormControl gridColumn={{ md: "span 2" }}>
                  <FormLabel>Bio</FormLabel>
                  <Input 
                    value={profile?.bio || ''} 
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
            {favorites.length === 0 ? (
              <Text color="gray.500">No favorite repositories yet.</Text>
            ) : (
              <VStack spacing={4} align="stretch">
                {favorites.map((repo) => (
                  <Box 
                    key={repo._id}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                  >
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <RouterLink to={`/repository/${repo._id}`}>
                          <Text fontWeight="bold" color="brand.500">{repo.name}</Text>
                        </RouterLink>
                        <Text fontSize="sm" color="gray.500">
                          Last analyzed: {repo.lastAnalyzedAt ? new Date(repo.lastAnalyzedAt).toLocaleDateString() : 'Never'}
                        </Text>
                      </VStack>
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme="yellow"
                        leftIcon={<FiStar />}
                        onClick={() => {
                          repositoryApi.toggleFavorite(repo._id);
                          setFavorites(favorites.filter(r => r._id !== repo._id));
                        }}
                      >
                        Unfavorite
                      </Button>
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
            <Heading size="md" mb={4}>Account Settings</Heading>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="email-notifications" mb="0">
                  Email Notifications
                </FormLabel>
                <Switch
                  id="email-notifications"
                  isChecked={profile?.settings?.emailNotifications}
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
                  isChecked={profile?.settings?.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="auto-analyze" mb="0">
                  Auto-Analyze New Repositories
                </FormLabel>
                <Switch
                  id="auto-analyze"
                  isChecked={profile?.settings?.autoAnalyze}
                  onChange={(e) => handleSettingChange('autoAnalyze', e.target.checked)}
                  colorScheme="brand"
                />
              </FormControl>
              <FormControl>
                <FormLabel htmlFor="default-privacy">Default Repository Privacy</FormLabel>
                <SimpleGrid columns={2} spacing={3}>
                  <Button
                    variant={profile?.settings?.defaultPrivacy === 'public' ? 'solid' : 'outline'}
                    colorScheme="brand"
                    onClick={() => handleSettingChange('defaultPrivacy', 'public')}
                  >
                    Public
                  </Button>
                  <Button
                    variant={profile?.settings?.defaultPrivacy === 'private' ? 'solid' : 'outline'}
                    colorScheme="brand"
                    onClick={() => handleSettingChange('defaultPrivacy', 'private')}
                  >
                    Private
                  </Button>
                </SimpleGrid>
              </FormControl>
            </VStack>
          </Box>
        </SimpleGrid>
      </Stack>
    </Container>
  );
};

export default ProfilePage;
