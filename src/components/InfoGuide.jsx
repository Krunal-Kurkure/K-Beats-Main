import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title1: 'Collections,',
    title2: 'Mini Player,',
    title3: 'Search, Setting & Others.',
    description:
      'You are able create Collection using + button, open Mini Player, Search Songs, App Settings and other Song Features.',
    image: require('../assets/Home1.png'),
    textPosition: 'bottom',
  },
  {
    id: '2',
    title1: 'Song',
    title2: 'Mini Player [  ]',
    title3: 'with Controls.',
    description:
      'Open Mini Player from Home Screen by allowing app over display permission. Tap to main Mini Player Card to expands the Mini Player, only in Android as IOS environment not supports it.',
    image: require('../assets/Home6.png'),
    textPosition: 'bottom',
  },
  {
    id: '3',
    title1: 'Song',
    title2: 'Trim',
    title3: 'From Ends.',
    description:
      'Click 3 dots Icon in Home Screen and select the Trim option and tap on Song to Trim, adjust the Trim Ranges, Play song for accurate Trim Timing and copy of song is Saved.',
    image: require('../assets/Home7.png'),
    textPosition: 'top',
  },
  {
    id: '4',
    title1: 'Navigate to Music Player via',
    title2: 'Bottom Card',
    title3: '& Import songs [+]',
    description:
      'Tap to bottom Music Card to open main Music Player for reach Music Controls, and Imports Songs Using [ + ] button into app.',
    image: require('../assets/Home2.png'),
    textPosition: 'top',
  },
  {
    id: '5',
    title1: 'Song View',
    title2: '&',
    title3: 'Lyrics.',
    description:
      'Tap to List Icon and make the songs appears in List View and for setting up the Songs Lyrics tap to music icon in Card.',
    image: require('../assets/Home3.png'),
    textPosition: 'bottom',
  },
  {
    id: '6',
    title: 'Lyrics Screen.',
    description:
      'Tap to edit Lyrics icon, Import the Song Lyrics and make Lyrics seperated in small line by line for further syncing. after tap to next and as per the song hit Sync button to play song lyrics exact same time and Save.',
    image: require('../assets/Home4.png'),
    textPosition: 'bottom',
  },
  {
    id: '7',
    title: 'Artist Collection.',
    description:
      'As you created the artist collection form Home Screen, Edit the info of artist from here, During importing songs the Artist Name should be Same as per your song Artist Name, so in Music Player the artist info will appears at Carousel.',
    image: require('../assets/Home5.png'),
    textPosition: 'bottom',
  },
];

const gradients = {
  topShadow1: ['rgba(0, 0, 0, 0.94)', 'rgba(0,0,0,0)'],
  bottomShadow: ['rgba(0, 0, 0, 0)', 'rgb(0, 0, 0)'],
  centerShadow: ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.7)'],
};

const InfoGuide = ({ visible, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = SLIDES[currentIndex];

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('@has_seen_guide', 'true');
    onClose();
  };

  const getAlignment = position => {
    switch (position) {
      case 'top':
        return 'flex-start';
      case 'center':
        return 'center';
      case 'bottom':
      default:
        return 'flex-end';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* --- IMAGE BACKGROUND AS THE MAIN CARD --- */}
        <ImageBackground
          source={currentSlide.image}
          style={styles.card}
          imageStyle={{ width: 306, height: 536 }}
        >
          {/* 1. Linear Gradients */}
          {currentSlide.textPosition === 'top' && (
            <LinearGradient
              colors={gradients.topShadow1}
              style={styles.topShadow1}
              pointerEvents="none"
            />
          )}
          {currentSlide.textPosition === 'bottom' && (
            <LinearGradient
              colors={gradients.bottomShadow}
              style={styles.bottomShadow}
              pointerEvents="none"
            />
          )}
          {currentSlide.textPosition === 'center' && (
            <LinearGradient
              colors={gradients.centerShadow}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
          )}

          {/* 2. Text Content Container */}
          <View
            style={[
              styles.textOverlayContainer,
              { justifyContent: getAlignment(currentSlide.textPosition) },
              currentSlide.textPosition === 'top' && { paddingTop: 30 },
              currentSlide.textPosition === 'bottom' && { paddingBottom: 30 },
            ]}
          >
            {currentSlide.title1 ? (
              <Text style={styles.title}>
                {currentSlide.title1}{' '}
                <Text style={{ color: '#ff003c' }}>{currentSlide.title2}</Text>{' '}
                {currentSlide.title3}
              </Text>
            ) : (
              <Text style={styles.title}>{currentSlide.title}</Text>
            )}
            <Text style={styles.description}>{currentSlide.description}</Text>
          </View>
        </ImageBackground>

        {/* --- PAGINATION DOTS --- */}
        <View style={styles.paginationContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>

        {/* --- FOOTER CONTROLS --- */}
        <View style={styles.footerControls}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handlePrev}
            disabled={currentIndex === 0}
          >
            <Icon
              name="chevron-back"
              size={36}
              color={currentIndex === 0 ? 'rgba(255,255,255,0.2)' : '#fff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.skipButton,
              {
                backgroundColor:
                  currentIndex === SLIDES.length - 1 ? '#7088ff' : '#4f4f4f',
              },
            ]}
            onPress={handleFinish}
          >
            <Text style={styles.skipText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleNext}
            disabled={currentIndex === SLIDES.length - 1}
          >
            <Icon
              name="chevron-forward"
              size={36}
              color={
                currentIndex === SLIDES.length - 1
                  ? 'rgba(255,255,255,0.2)'
                  : '#fff'
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginTop: 40,
    width: 312,
    height: 542,
    backgroundColor: '#1E1E1E', // Dark background fills in any blank space left by resizeMode="contain"
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#707070',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  topShadow1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  bottomShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  textOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 22,
    zIndex: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 18,
  },
  paginationContainer: {
    flexDirection: 'row',
    marginTop: 30, // Spacing between card and dots
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 5,
  },
  activeDot: {
    width: 24, // Wide pill format
    backgroundColor: '#fff',
  },
  footerControls: {
    width: width * 0.85,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  iconButton: {
    padding: 10,
  },
  skipButton: {
    paddingVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 40,
  },
  skipText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default InfoGuide;
