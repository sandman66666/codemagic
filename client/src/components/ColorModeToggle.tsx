import React, { useEffect, useCallback } from 'react';
import { IconButton, useColorMode, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

const ColorModeToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  
  // Ensure localStorage is updated whenever colorMode changes
  useEffect(() => {
    localStorage.setItem('chakra-ui-color-mode', colorMode);
  }, [colorMode]);
  
  // Memoized toggle function
  const handleToggleColorMode = useCallback(() => {
    toggleColorMode();
  }, [toggleColorMode]);
  
  return (
    <Tooltip label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <IconButton
        aria-label={`Toggle ${colorMode === 'light' ? 'Dark' : 'Light'} Mode`}
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={handleToggleColorMode}
        variant="ghost"
        color={useColorModeValue('gray.600', 'gray.300')}
        _hover={{
          bg: useColorModeValue('gray.100', 'gray.700'),
        }}
        size="md"
      />
    </Tooltip>
  );
};

export default ColorModeToggle;
