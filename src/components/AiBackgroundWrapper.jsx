import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const AiBackgroundWrapper = ({ children }) => {
  const { width, height } = useWindowDimensions();

  // Expanded to 6 states for more colors (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6)
  const colorAnim = useRef(new Animated.Value(0)).current;
  // Drives the uneven, organic floating motion
  const floatAnim = useRef(new Animated.Value(0)).current;

  const { isFancyMode, isAnimationEnabled } = useTheme();

  // CRITICAL FIX 1: Only animate if Light Mode is ON (!isFancyMode) AND animations are enabled
  const shouldAnimate = !isFancyMode && isAnimationEnabled;

  useEffect(() => {
    if (shouldAnimate) {
      // 1. Color Crossfade Loop
      Animated.loop(
        Animated.timing(colorAnim, {
          toValue: 6,
          duration: 24000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();

      // 2. Uneven Floating Motion
      Animated.loop(
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 25000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      colorAnim.stopAnimation();
      colorAnim.setValue(0);
      floatAnim.stopAnimation();
      floatAnim.setValue(0);
    }
  }, [shouldAnimate, colorAnim, floatAnim]);

  // --- 1. FULL-SCREEN COLOR CROSSFADES (6 Colors) ---
  const opacityLayer1 = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [1, 0, 0, 0, 0, 0, 1],
  }); // Purple
  const opacityLayer2 = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [0, 1, 0, 0, 0, 0, 0],
  }); // Blue
  const opacityLayer3 = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [0, 0, 1, 0, 0, 0, 0],
  }); // Magenta
  const opacityLayer4 = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [0, 0, 0, 1, 0, 0, 0],
  }); // Teal
  const opacityLayer5 = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [0, 0, 0, 0, 1, 0, 0],
  }); // Orange
  const opacityLayer6 = colorAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4, 5, 6],
    outputRange: [0, 0, 0, 0, 0, 1, 0],
  }); // Gold

  // --- 2. UNEVEN, ORGANIC FLOATING MOTION ---
  const translateX = floatAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 30, -20, 25, 0],
  });

  const translateY = floatAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -35, 25, -15, 0],
  });

  const rotate = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-8deg', '8deg', '-8deg'],
  });

  const scale = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.1, 1.25, 1.1],
  });

  // --- 3. ANIMATED WHITE MASK MOTION (TOP & BOTTOM) ---
  const maskTranslateY = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-20, 15, -20], // Top mask breathes up and down
  });

  const maskRotate = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-6deg', '6deg', '-6deg'], // Top mask tilts
  });

  const maskScale = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.1, 1.3, 1.1], // Both masks share this breathing scale
  });

  // Opposite motion for the bottom mask so it moves organically against the top mask
  const bottomMaskTranslateY = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [20, -15, 20], // Moves inverse to the top mask
  });

  const bottomMaskRotate = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['6deg', '-6deg', '6deg'], // Tilts opposite to the top mask
  });

  return (
    // Base container color gracefully falls back depending on the theme
    <View
      style={[
        styles.container,
        { backgroundColor: isFancyMode ? '#151515' : '#ffffff' },
      ]}
    >
      {shouldAnimate ? (
        <View style={StyleSheet.absoluteFill}>
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }]}
          />

          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                width: width * 1.5,
                height: height * 1.2,
                top: height * 0.1,
                left: -width * 0.25,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate },
                  { scale },
                ],
              },
            ]}
          >
            {/* LAYER 1: Purple */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: opacityLayer1 }]}
            >
              <LinearGradient
                colors={['#ffffff', '#9752ff95', '#e3bcff', '#b685ffe5', 'rgb(84, 36, 156)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* LAYER 2: Blue */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: opacityLayer2 }]}
            >
              <LinearGradient
                colors={['#ffffff', '#1755ff95', '#c6c3ff', '#98b3ffe5', '#1e46a3']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.2, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* LAYER 3: Magenta */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: opacityLayer3 }]}
            >
              <LinearGradient
                colors={['#ffffff', '#e0257395', '#ffcfcf', '#ff4545e5', '#751313']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* LAYER 4: Teal */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: opacityLayer4 }]}
            >
              <LinearGradient
                colors={['#ffffff', '#2dffed95', '#bbf7ff', '#65fff2e5', '#178c99']}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* LAYER 5: Orange/Peach */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: opacityLayer5 }]}
            >
              <LinearGradient
                colors={['#ffffff', '#ffa60095', '#fff8c7', '#ffa148e5', '#957916']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* LAYER 6: Gold/Yellow */}
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: opacityLayer6 }]}
            >
              <LinearGradient
                colors={['#ffffff', '#37ff5595', '#caffcb', '#39ff46e5', '#158b21']}
                start={{ x: 1, y: 0.2 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>

          {/* === THE ANIMATED WHITE TOP MASK === */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                width: width * 1.5,
                height: height,
                top: -height * 0.1,
                left: -width * 0.25,
                transform: [
                  { translateY: maskTranslateY },
                  { rotate: maskRotate },
                  { scale: maskScale },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['#ffffff', '#ffffff', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.4, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* === THE ANIMATED WHITE BOTTOM MASK === */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                width: width * 1.5,
                height: height,
                top: height * 0.01, // Pushed down slightly
                left: -width * 0.25,
                transform: [
                  { translateY: bottomMaskTranslateY },
                  { rotate: bottomMaskRotate },
                  { scale: maskScale },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              // Colors inverted to fade OUT as it goes UP
              colors={['rgba(255, 255, 255, 0)', '#ffffff', '#ffffff']}
              start={{ x: 0.4, y: 0.5 }}
              end={{ x: 0.2, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

        </View>
      ) : (
        // CRITICAL FIX 3: Dynamic fallback based on theme
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isFancyMode ? '#151515' : '#ffffff' },
          ]}
        />
      )}

      {/* The Content Layer */}
      <View style={styles.contentOverlay}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default AiBackgroundWrapper;