import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

const CustomSlider = () => {
  const progress = useProgress(1000);
  // --------------------- THEME CONTEXT & GRID CHANGE STATE AND ASYNC MEMORY STATES--------------------------
  const { isFancyMode } = useTheme();

  const [sliderWidth, setSliderWidth] = useState(0);
  const [localTime, setLocalTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubDirection, setScrubDirection] = useState(0);

  const ignoreProgressUntil = useRef(0);
  const lastScrubTime = useRef(0);
  const directionResetTimeout = useRef(null);

  // 💡 NEW: Animation Refs and States
  const seekAnim = useRef(new Animated.Value(0)).current;
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimer = useRef(null);
  const isScrubbingRef = useRef(false); // Used inside the timeout to check real-time scrub state

  const duration = progress.duration > 0 ? progress.duration : 1;

  useEffect(() => {
    if (isScrubbing) return;
    if (Date.now() < ignoreProgressUntil.current) return;
    setLocalTime(progress.position || 0);
  }, [progress.position, isScrubbing]);

  const thumbWidth = 32;
  const tooltipWidth = 50;
  const trackWidth = sliderWidth - thumbWidth;
  const percentage = localTime / duration;
  const tooltipLeftPosition =
    percentage * trackWidth + thumbWidth / 2 - tooltipWidth / 2;

  // 💡 NEW: Function to animate buttons in and set the 3-second hide timer
  const activateSeekControls = () => {
    // Clear any existing hide timer so it stays alive longer
    if (hideTimer.current) clearTimeout(hideTimer.current);

    setControlsVisible(true);

    // Animate In (Fade in and slide up)
    Animated.timing(seekAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false, // Changed to false to allow height layout animation
    }).start();

    // Set a new 3 second timer to animate out
    hideTimer.current = setTimeout(() => {
      // If the user is STILL holding the slider thumb, do not hide the buttons yet
      if (isScrubbingRef.current) return;

      Animated.timing(seekAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false, // Changed to false to allow height layout animation
      }).start(() => {
        setControlsVisible(false); // Disable touches once fully hidden
      });
    }, 3500);
  };

  const handleSlidingStart = () => {
    setIsScrubbing(true);
    isScrubbingRef.current = true;
    setScrubDirection(0);
    activateSeekControls(); // Trigger animation when grabbing the thumb
  };

  const handleValueChange = val => {
    setLocalTime(val);

    const diff = val - lastScrubTime.current;
    if (diff > 0.1) setScrubDirection(1);
    else if (diff < -0.1) setScrubDirection(-1);

    lastScrubTime.current = val;

    if (directionResetTimeout.current)
      clearTimeout(directionResetTimeout.current);
    directionResetTimeout.current = setTimeout(() => {
      setScrubDirection(0);
    }, 150);
  };

  const handleSlidingComplete = val => {
    setIsScrubbing(false);
    isScrubbingRef.current = false;
    setScrubDirection(0);
    setLocalTime(val);

    ignoreProgressUntil.current = Date.now() + 1000;
    TrackPlayer.seekTo(val);

    // Calling this on release starts the 3-second countdown to hide them
    activateSeekControls();
  };

  // 💡 NEW: Seek Handlers now trigger the `activateSeekControls` to reset the 3s timer
  const seekFiveBackward = async () => {
    const newTime = Math.max(0, localTime - 5);
    setLocalTime(newTime);
    await TrackPlayer.seekTo(newTime);
    activateSeekControls();
  };

  const seekFiveForward = async () => {
    const newTime = Math.min(duration, localTime + 5);
    setLocalTime(newTime);
    await TrackPlayer.seekTo(newTime);
    activateSeekControls();
  };

  const seekTenBackward = async () => {
    const newTime = Math.max(0, localTime - 10);
    setLocalTime(newTime);
    await TrackPlayer.seekTo(newTime);
    activateSeekControls();
  };

  const seekTenForward = async () => {
    const newTime = Math.min(duration, localTime + 10);
    setLocalTime(newTime);
    await TrackPlayer.seekTo(newTime);
    activateSeekControls();
  };

  const formatTime = s => {
    const totalSeconds = Math.round(s);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const textColor = isFancyMode ? '#fff' : '#000';
  const tooltipBg = isFancyMode ? '#ffffff' : '#333333e6';
  const tooltipText = isFancyMode ? '#333333e6' : '#ffffff';

  return (
    <View style={styles.container}>
      <View
        style={styles.sliderWrapper}
        onLayout={event => setSliderWidth(event.nativeEvent.layout.width)}
      >
        {isScrubbing && sliderWidth > 0 && (
          <View
            style={[
              styles.floatingWrapper,
              { left: tooltipLeftPosition, width: tooltipWidth },
            ]}
          >
            <View
              style={[
                styles.floatingBubble,
                { backgroundColor: '#ff0026', width: tooltipWidth },
              ]}
            >
              <Text style={[styles.floatingBubbleText, { color: '#fff' }]}>
                {formatTime(localTime)}
              </Text>
            </View>
            {scrubDirection === 0 && (
              <View
                style={[
                  styles.floatingBubbleArrow,
                  { borderTopColor: '#ff0026' },
                ]}
              />
            )}
          </View>
        )}

        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={progress.duration || 0}
          value={localTime}
          step={1}
          onSlidingStart={handleSlidingStart}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={'#ff0026'}
          maximumTrackTintColor={
            isFancyMode ? 'rgba(255, 255, 255, 0.74)' : '#b6b6b6ff'
          }
          thumbTintColor={'#ff0026'}
        />
      </View>


      {/* Track Timers */}
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: textColor }]}>
          {formatTime(localTime)}
        </Text>
        {/* 💡 NEW: Animated Container for the Seek Buttons */}
      <Animated.View
        style={[
          styles.seekControlsRow,
          {
            height: seekAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 25], // Completely removes the empty space when hidden!
            }),
            opacity: seekAnim, // Fades from 0 to 1
            overflow: 'hidden', // Ensures buttons don't spill outside while shrinking
            transform: [
              {
                translateY: seekAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [15, 0], // Slides up from 15px down to its normal position
                }),
              },
            ],
          },
        ]}
        // Prevents invisible buttons from being tapped accidentally
        pointerEvents={controlsVisible ? 'auto' : 'none'}
      >
          <TouchableOpacity
            onPress={seekFiveBackward}
            style={[styles.seekBtn, { backgroundColor: tooltipBg }]}
          >
            <Feather name="rotate-ccw" size={14} color={tooltipText} />
            <Text style={[styles.seekText, { color: tooltipText }]}> 5s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={seekTenBackward}
            style={[styles.seekBtn, { backgroundColor: tooltipBg }]}
          >
            <Feather name="rotate-ccw" size={14} color={tooltipText} />
            <Text style={[styles.seekText, { color: tooltipText }]}> 10s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={seekTenForward}
            style={[styles.seekBtn, { backgroundColor: tooltipBg }]}
          >
            <Text style={[styles.seekText, { color: tooltipText }]}>10s </Text>
            <Feather name="rotate-cw" size={14} color={tooltipText} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={seekFiveForward}
            style={[styles.seekBtn, { backgroundColor: tooltipBg }]}
          >
            <Text style={[styles.seekText, { color: tooltipText }]}>5s </Text>
            <Feather name="rotate-cw" size={14} color={tooltipText} />
          </TouchableOpacity>
      </Animated.View>
        <Text style={[styles.timeText, { color: textColor }]}>
          {formatTime(duration)}
        </Text>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  seekControlsRow: {
    marginBottom:14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 8,
    zIndex: 2,
  },
  seekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  seekText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderWrapper: {
    width: '100%',
    position: 'relative',
    alignItems: 'flex-start',
    marginTop: -5, // Moved the negative margin here so it doesn't cause jumps when the row shrinks
  },
  floatingWrapper: {
    top: -30,
    zIndex: 10,
    alignItems: 'center',
    position: 'absolute',
  },
  floatingBubble: {
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  floatingBubbleText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  floatingBubbleArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    alignItems:'center',
    marginTop: -5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default CustomSlider;
