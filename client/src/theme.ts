import { extendTheme, ThemeConfig } from '@chakra-ui/react';

// Function to get the color mode from localStorage
const getStoredColorMode = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  
  const storedColorMode = localStorage.getItem('chakra-ui-color-mode');
  return (storedColorMode === 'dark' || storedColorMode === 'light') 
    ? storedColorMode 
    : 'light';
};

// Define the color mode configuration
const config: ThemeConfig = {
  initialColorMode: getStoredColorMode(),
  useSystemColorMode: false,
};

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#bae7ff',
      200: '#91d5ff',
      300: '#69c0ff',
      400: '#40a9ff',
      500: '#1890ff',
      600: '#096dd9',
      700: '#0050b3',
      800: '#003a8c',
      900: '#002766',
    },
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  config,
  styles: {
    global: (props: { colorMode: 'light' | 'dark' }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
});

export default theme;
