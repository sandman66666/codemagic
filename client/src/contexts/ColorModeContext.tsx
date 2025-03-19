import React, { createContext, useContext, useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';

interface ColorModeContextType {
  toggleColorMode: () => void;
  colorMode: 'light' | 'dark';
}

const ColorModeContext = createContext<ColorModeContextType>({
  toggleColorMode: () => {},
  colorMode: 'light',
});

export const useColorModeContext = () => useContext(ColorModeContext);

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colorMode, toggleColorMode } = useColorMode();

  // Load saved color mode from localStorage on initial render
  useEffect(() => {
    const savedColorMode = localStorage.getItem('chakra-ui-color-mode');
    if (savedColorMode && savedColorMode !== colorMode) {
      // If the saved color mode is different from the current one, toggle it
      toggleColorMode();
    }
  }, []);

  // Save color mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chakra-ui-color-mode', colorMode);
  }, [colorMode]);

  return (
    <ColorModeContext.Provider value={{ colorMode, toggleColorMode }}>
      {children}
    </ColorModeContext.Provider>
  );
};

export default ColorModeContext;
