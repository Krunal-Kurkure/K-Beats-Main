import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// 1. The Music Visualizer Component
const MusicVisualizer = ({ isPlaying, isDarkList }) => {
  // Initial heights (set to 10 so they have a resting state when paused)
  const bar1Height = useRef(new Animated.Value(10)).current;
  const bar2Height = useRef(new Animated.Value(10)).current;
  const bar3Height = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Helper function to generate the loop
    const createAnimation = (animValue, minHeight, maxHeight, duration) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: maxHeight,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(animValue, {
            toValue: minHeight,
            duration: duration,
            useNativeDriver: false,
          }),
        ]),
      );
    };

    // We only create and start the animations if the song is actively playing
    if (isPlaying) {
      const anim1 = createAnimation(bar1Height, 10, 18, 300);
      const anim2 = createAnimation(bar2Height, 10, 28, 250);
      const anim3 = createAnimation(bar3Height, 10, 18, 400);

      anim1.start();
      anim2.start();
      anim3.start();

      // CLEANUP: This runs the exact moment isPlaying changes to false
      return () => {
        // Stop the current loops
        anim1.stop();
        anim2.stop();
        anim3.stop();

        // Smoothly animate all bars back down to the resting height (10)
        Animated.timing(bar1Height, {
          toValue: 10,
          duration: 200,
          useNativeDriver: false,
        }).start();
        Animated.timing(bar2Height, {
          toValue: 10,
          duration: 200,
          useNativeDriver: false,
        }).start();
        Animated.timing(bar3Height, {
          toValue: 10,
          duration: 200,
          useNativeDriver: false,
        }).start();
      };
    }
  }, [isPlaying]); // Re-runs every time isPlaying changes

  return (
    <View style={styles.visualizerContainer}>
      <Animated.View
        style={[
          styles.bar,
          {
            height: bar1Height,
            backgroundColor: isDarkList ? '#FFFFFF' : '#000000',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            height: bar2Height,
            backgroundColor: isDarkList ? '#FFFFFF' : '#000000',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bar,
          {
            height: bar3Height,
            backgroundColor: isDarkList ? '#FFFFFF' : '#000000',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  visualizerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
    gap: 4,
  },
  bar: {
    width: 4.5,
    borderRadius: 3,
  },
});

export default MusicVisualizer;
