import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import theme from './theme';

const queryClient = new QueryClient();

// Ensure color mode is set before rendering
if (typeof window !== 'undefined') {
  // Get stored value
  const colorMode = localStorage.getItem('chakra-ui-color-mode');
  // If no value is stored, set default
  if (!colorMode) {
    localStorage.setItem('chakra-ui-color-mode', 'light');
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <Router>
          <App />
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
