import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Stack,
  Image,
  Flex,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCode, FiShield, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

const Feature = ({ title, text, icon }: { title: string; text: string; icon: React.ReactElement }) => {
  return (
    <Stack align={'center'} textAlign={'center'}>
      <Flex
        w={16}
        h={16}
        align={'center'}
        justify={'center'}
        color={'white'}
        rounded={'full'}
        bg={'brand.500'}
        mb={1}
      >
        {icon}
      </Flex>
      <Text fontWeight={600}>{title}</Text>
      <Text color={'gray.600'}>{text}</Text>
    </Stack>
  );
};

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Box>
      <Container maxW={'7xl'}>
        <Stack
          align={'center'}
          spacing={{ base: 8, md: 10 }}
          py={{ base: 20, md: 28 }}
          direction={{ base: 'column', md: 'row' }}
        >
          <Stack flex={1} spacing={{ base: 5, md: 10 }}>
            <Heading
              lineHeight={1.1}
              fontWeight={600}
              fontSize={{ base: '3xl', sm: '4xl', lg: '6xl' }}
            >
              <Text
                as={'span'}
                position={'relative'}
                _after={{
                  content: "''",
                  width: 'full',
                  height: '30%',
                  position: 'absolute',
                  bottom: 1,
                  left: 0,
                  bg: 'brand.400',
                  zIndex: -1,
                }}
              >
                Understand code
              </Text>
              <br />
              <Text as={'span'} color={'brand.500'}>
                with AI assistance
              </Text>
            </Heading>
            <Text color={'gray.500'}>
              CodeInsight enhances code understanding by leveraging AI to analyze GitHub repositories.
              Get intelligent code analysis, vulnerability scanning, and interactive visualizations for your
              codebase.
            </Text>
            <Stack
              spacing={{ base: 4, sm: 6 }}
              direction={{ base: 'column', sm: 'row' }}
            >
              <Button
                as={RouterLink}
                to={isAuthenticated ? '/dashboard' : '/login'}
                rounded={'full'}
                size={'lg'}
                fontWeight={'normal'}
                px={6}
                colorScheme={'brand'}
                bg={'brand.500'}
                _hover={{ bg: 'brand.600' }}
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              </Button>
              <Button
                as={RouterLink}
                to={'/#features'}
                rounded={'full'}
                size={'lg'}
                fontWeight={'normal'}
                px={6}
                leftIcon={<FiCode />}
              >
                Learn more
              </Button>
            </Stack>
          </Stack>
          <Flex
            flex={1}
            justify={'center'}
            align={'center'}
            position={'relative'}
            w={'full'}
          >
            <Box
              position={'relative'}
              height={'300px'}
              rounded={'2xl'}
              boxShadow={'2xl'}
              width={'full'}
              overflow={'hidden'}
            >
              <Image
                alt={'Hero Image'}
                fit={'cover'}
                align={'center'}
                w={'100%'}
                h={'100%'}
                src={
                  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1169&q=80'
                }
              />
            </Box>
          </Flex>
        </Stack>

        <Box p={4} id="features">
          <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'}>
            <Heading fontSize={'3xl'}>Features</Heading>
            <Text color={'gray.600'} fontSize={'xl'}>
              Powerful tools for developers to understand, analyze, and improve their code
            </Text>
          </Stack>

          <Container maxW={'6xl'} mt={10}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
              <Feature
                icon={<Icon as={FiCode} w={10} h={10} />}
                title={'Code Analysis'}
                text={'AI-powered code review that identifies patterns, best practices, and issues.'}
              />
              <Feature
                icon={<Icon as={FiShield} w={10} h={10} />}
                title={'Security Scanning'}
                text={'Detect security vulnerabilities in your codebase before they become a problem.'}
              />
              <Feature
                icon={<Icon as={FiBarChart2} w={10} h={10} />}
                title={'Interactive Visualizations'}
                text={'Explore your codebase with intuitive visualizations that show dependencies and structure.'}
              />
            </SimpleGrid>
          </Container>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
