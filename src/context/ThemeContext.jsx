// context/ThemeContext.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';
import changeNavigationBarColor from 'react-native-navigation-bar-color';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Default to true (Dark mode is ON when app opens)
  const [isFancyMode, setIsFancyMode] = useState(true);

  // CRITICAL FIX: Default to false (Animation must be OFF when app opens in Dark Mode)
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);

  //FOR GRID AND THE LIST VIEW STATES ----------------------------------------------------------------------------------------------------------------

  const [showGrid, setShowGrid] = useState(true);

  // NEW: State to hold off rendering until memory is checked
  const [isReady, setIsReady] = useState(false);

  // -------------------------- LOAD THE SAVED STATE WHEN THE COMPONET MOUNT --------------------
  useEffect(() => {
    const loadViewState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('viewPreference');
        if (savedState !== null) {
          setShowGrid(JSON.parse(savedState));
        }
      } catch (error) {
        console.log('Error loading view state', error);
      } finally {
        // NEW: Tell the app it is safe to render the UI now
        setIsReady(true);
      }
    };
    loadViewState();
  }, []);

  // Function to handle the toggle AND save it to memory
  const toggleView = async () => {
    const newState = !showGrid;
    setShowGrid(newState);
    try {
      await AsyncStorage.setItem('viewPreference', JSON.stringify(newState));
    } catch (error) {
      console.log('Error saving view state', error);
    }
  };
  //--------------------------------------------------------------------------------------------------------------------------------------------

  // Toggle functions
  const toggleTheme = () => {
    setIsFancyMode(prevMode => {
      const nextMode = !prevMode;

      // If the user is turning ON Dark Theme, forcefully turn OFF the animation.
      if (nextMode === true) {
        setIsAnimationEnabled(false);
      }

      return nextMode;
    });
  };

  //animation button or the theme light
  const toggleAnimation = () => {
    // SECURITY CHECK: If Dark Theme is ON, ignore any attempts to toggle the animation.
    if (isFancyMode) return;

    setIsAnimationEnabled(prev => !prev);
  };

  // --- CENTRALIZED NAVIGATION BAR LOGIC ---
  // This runs globally. You don't need to add this code to every screen anymore.
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        if (isFancyMode) {
          // Dark Mode: Black Nav Bar, White Icons
          changeNavigationBarColor('#414141', false);
          StatusBar.setBarStyle('light-content');
          StatusBar.setBackgroundColor('#000000'); // Or transparent if you prefer
        } else {
          // Light Mode: White Nav Bar, Black Icons
          changeNavigationBarColor('#ffffff', true);
          StatusBar.setBarStyle('dark-content');
          StatusBar.setBackgroundColor('#ffffff');
        }
      } catch (e) {
        console.log('Theme Error:', e);
      }
    }
  }, [isFancyMode]);

  return (
    <ThemeContext.Provider
      value={{
        isFancyMode,
        toggleTheme,
        isAnimationEnabled,
        toggleAnimation,
        toggleView,
        showGrid,
        setShowGrid,
        isReady,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
