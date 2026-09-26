import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------- APP CONTEXT ----------------------
import { useTheme } from '../context/ThemeContext';

const SplashScreen = ({ navigation }) => {

  // ---------------- USE-EFFECT FOR NAVIGATION ----------------------
  useEffect(() => {
    let isMounted = true;
    const MIN_SPLASH_MS = 2000;

    (async () => {
      const start = Date.now();

      const onboardingDone = await AsyncStorage.getItem('onboarding_done');

      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed);

      setTimeout(() => {
        if (!isMounted) return;

        if (onboardingDone === null) {
          navigation.replace('Onboarding'); // <- changed to single onboarding screen
        } else {
          navigation.replace('Home');
        }
      }, wait);
    })();

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  // ---------------- THEME CONTEXT CHILD'S ----------------
  const { isFancyMode } = useTheme();
  const bgColor = isFancyMode ? '#151515' : '#fff';

  // ---------------- MAIN USER INTERFACE ------------------------
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar hidden />
      <Image
        source={require('../assets/splashlogo.png')}
        resizeMode="contain"
        style={styles.logo}
      />
    </View>
  );
};

export default SplashScreen;

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
  },

  logo: { 
    width: 220, 
    height: 220,
  },
});