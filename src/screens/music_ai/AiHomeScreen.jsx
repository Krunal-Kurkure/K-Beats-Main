import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Image,
  ActivityIndicator,
} from 'react-native';

// ---------------------------- SAFE AREA CONTEXT ---------------------------
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------- NATIVE NAVIGATION ----------------------------
import { useNavigation } from '@react-navigation/native';

const AiHomeScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('AiSelectSong');
      // Change to your desired screen if needed
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <ImageBackground
      source={require('../../assets/coloreBg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.mainContainer}>
          <Text style={styles.subHeading}>
            Isolate Vocals, Bass & Drums
          </Text>

          <Text style={styles.heading}>
            Smart Ai Music Separation
          </Text>

          <Image
            source={require('../../assets/aiLogoMain.png')}
            style={styles.aiLogo}
            resizeMode="contain"
          />

          <View style={styles.loaderContainer}>
            <ActivityIndicator
              size="large"
              color="#FFFFFF"
            />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default AiHomeScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  safeArea: {
    flex: 1,
  },

  mainContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },

  subHeading: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  heading: {
    fontSize: 40,
    marginTop: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  aiLogo: {
    width: 250,
    height: 255,
    marginTop: 35,
  },

  loaderContainer: {
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 15,
    marginTop: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});