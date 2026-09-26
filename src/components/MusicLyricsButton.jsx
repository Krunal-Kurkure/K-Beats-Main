import Ionicons from 'react-native-vector-icons/Ionicons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePlayer } from '../context/PlayerContext';
import { useNavigation } from '@react-navigation/native';

const MusicLyricsButton = () => {
  const { isPlaying } = usePlayer();

  const navigation = useNavigation();
  const anim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const startAnimationLoop = () => {
      if (!runningRef.current) return;

      timeoutRef.current = setTimeout(() => {
        if (!runningRef.current) return;

        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),

          Animated.delay(1500),

          Animated.timing(anim, {
            toValue: 0,
            duration: 500,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: false,
          }),
        ]).start(() => {
          startAnimationLoop(); // 🔁 manual loop
        });
      }, 8000); // ⏱️ delay
    };

    // 🛑 STOP everything
    runningRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    anim.stopAnimation();
    anim.setValue(0);

    // ▶️ START again
    if (isPlaying) {
      runningRef.current = true;
      startAnimationLoop();
    }

    return () => {
      runningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isPlaying, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 95],
  });

  const textOpacity = anim.interpolate({
    inputRange: [0, 0.3, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const textTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('LyricsScreen')} activeOpacity={0.85}>
        <Animated.View style={[styles.button, { width }]}>
          
          <View style={styles.iconBox}>
            <Ionicons name="musical-note" size={20} color="#ffffff" />
          </View>

          <Animated.Text
            numberOfLines={1}
            style={[
              styles.text,
              {
                opacity: textOpacity,
                transform: [{ translateX: textTranslateX }],
              },
            ]}
          >
            Lyrics
          </Animated.Text>

        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export default MusicLyricsButton;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  button: {
    height: 40,
    borderRadius: 100,
    backgroundColor: '#00000078',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
});