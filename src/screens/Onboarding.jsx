// src/screens/Onboarding/Onboarding.jsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SystemNavigationBar from 'react-native-system-navigation-bar';

// ---------------- ICONS IMPORTS -------------------
import Feather from 'react-native-vector-icons/Feather';

// ---------------- FOR FULL IMAGE WIDTH/HEIGHT -------------------
const { width, height } = Dimensions.get('window');

// ---------------- ONBOARDING IMAGE SLIDES -------------------
const SLIDES = [
  {
    key: '1',
    title: 'K-Beats - The Music Player',
    description:
      'Master your music with effortless controls, play every song in perfect rhythm.',
    image: require('./../assets/onboard1.png'),
  },
  {
    key: '2',
    title: 'Full Control On You!!',
    description:
      '"Create own Normal/Artist collection, edit song info or delete it permanant, Add Signle/Multiple songs with info”.',
    image: require('./../assets/onboard2.png'),
  },
  {
    key: '3',
    title: 'PlayList Functionality',
    description:
      '"Your playlist, your power: smooth controls to play, add, remove, and arrange songs effortlessly”.',
    image: require('./../assets/onboard3.png'), // update if needed
  },
  {
    key: '4',
    title: 'Edit & Sync Lyrics Your Way',
    description:
      'Take control of your music experience—edit and sync lyrics in real-time with the song. Fine-tune every line and match the beat perfectly.',
    image: require('./../assets/onboard4.png'),
  },
  {
    key: '5',
    title: 'Smart Mini Player',
    description:
      'Play music with ease using the mini player. Access controls, expand for full view, and preview your next 5 songs in the queue—all in one place.',
    image: require('./../assets/onboard5.png'),
  },
];

export default function Onboarding({ navigation }) {
  const listRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    SystemNavigationBar.navigationHide();
  }, []);

  // Animated scrollX for dot animations
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setCurrentIndex(idx);
    }
  });

  const goToIndex = index => {
    if (index < 0 || index >= SLIDES.length) return;
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  // ---------------- NEXT ONBOADING ----------------
  const handleNext = async () => {
    if (currentIndex === SLIDES.length - 1) {
      await AsyncStorage.setItem('onboarding_done', 'true');
      navigation.replace('Home');
    } else {
      goToIndex(currentIndex + 1);
    }
  };

  // ---------------- BACK ONBOADING ----------------
  const handleBack = () => {
    if (currentIndex === 0) return;
    goToIndex(currentIndex - 1);
  };

  // ---------------- IMAGE BACKGOUND FOR APP ----------------
  const renderItem = ({ item }) => (
    <ImageBackground
      source={item.image}
      style={styles.imageBackground}
      resizeMode="cover" // cover ensures full-bleed background
    >
      {/* overlay for text readability */}
      <View style={styles.overlay} />

      {/* Bottom content: absolute so it sits on top of image */}
      <SafeAreaView style={styles.bottomSafe}>
        <View style={styles.contentWrap}>
          <View style={styles.textContainer}>
            <Text
              accessible
              accessibilityRole="header"
              style={styles.title}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>
          </View>

          {/* Footer row with dots (left) and nav (right) */}
          <View style={styles.footerRow}>
            {/* Dots */}
            <View style={styles.dotsRow} pointerEvents="none">
              {SLIDES.map((_, i) => {
                const inputRange = [
                  (i - 1) * width,
                  i * width,
                  (i + 1) * width,
                ];
                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.9, 1.25, 0.9],
                  extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.5, 1, 0.5],
                  extrapolate: 'clamp',
                });
                const bgColor = scrollX.interpolate({
                  inputRange,
                  outputRange: [
                    'rgba(255,255,255,0.45)',
                    'rgba(255,255,255,1)',
                    'rgba(255,255,255,0.45)',
                  ],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View
                    key={`dot-${i}`}
                    style={[
                      styles.dot,
                      {
                        transform: [{ scale }],
                        opacity,
                        backgroundColor: bgColor,
                      },
                    ]}
                    accessibilityLabel={`Slide ${i + 1} ${
                      currentIndex === i ? 'selected' : ''
                    }`}
                  />
                );
              })}
            </View>

            {/* Navigation Buttons */}
            {/* Navigation Buttons */}
            <View style={styles.navButtons}>
              <TouchableOpacity
                onPress={handleBack}
                disabled={currentIndex === 0}
                style={[
                  styles.circleButton,
                  currentIndex === 0 && styles.circleButtonDisabled,
                ]}
                accessibilityLabel="Previous slide"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="arrow-left" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                style={styles.circleButton}
                accessibilityLabel={
                  currentIndex === SLIDES.length - 1
                    ? 'Get Started'
                    : 'Next slide'
                }
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={
                    currentIndex === SLIDES.length - 1 ? 'check' : 'arrow-right'
                  }
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );

  // ---------------- MAIN USER INTERFACE ----------------
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={styles.container}>
        <StatusBar hidden />
        <Animated.FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={item => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewConfigRef.current}
          initialScrollIndex={0}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          decelerationRate="fast"
          // Animated scroll event updates scrollX for dot animations
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }, // false because we interpolate backgroundColor (non-native)
          )}
          scrollEventThrottle={16}
        />
      </View>
    </ScrollView>
  );
}

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  imageBackground: {
    width,
    height,
    flex: 1,
    justifyContent: 'flex-end',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },

  bottomSafe: {
    width: '100%',
    justifyContent: 'flex-end',
  },

  contentWrap: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 10,
  },

  textContainer: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '800',
    textShadowRadius: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
  },

  description: {
    color: '#f0f0f0',
    fontSize: 15,
    opacity: 0.95,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 9,
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },

  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  circleButton: {
    width: 48,
    height: 48,
    elevation: 4,
    marginLeft: 12,
    borderRadius: 24,
    shadowRadius: 3.5,
    shadowOpacity: 0.25,
    alignItems: 'center',
    shadowColor: '#000',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  circleButtonDisabled: {
    opacity: 0.35,
  },

  circleIcon: {
    fontSize: 20,
    lineHeight: 20,
    color: '#fff',
    fontWeight: '800',
  },
});
