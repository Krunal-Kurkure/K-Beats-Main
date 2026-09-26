import { Easing, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

const MarqueeText = ({
  text,
  textStyle,
  containerStyle,
  active,
  delay = 2000, // Pause before it starts moving (at the start position)
  speed = 40, // Pixels per second
  gap = 120, // Space between the end of Text 1 and the start of Text 2
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [measurement, setMeasurement] = useState({ text: '', width: 0 });

  const isMeasured = measurement.text === text && measurement.width > 0;
  const textWidth = isMeasured ? measurement.width : 0;

  const shouldAnimate =
    isMeasured && textWidth > containerWidth && containerWidth > 0;

  useEffect(() => {
    // 1. Stop any running animations
    if (animationRef.current) {
      animationRef.current.stop();
    }
    translateX.stopAnimation();

    if (active && shouldAnimate) {
      // 2. Calculate the exact distance to slide before snapping back
      const distance = textWidth + gap;
      const duration = (distance / speed) * 1000;

      // 3. The Infinite Loop Function
      const animate = () => {
        translateX.setValue(0); // Snap back to 0 (start position)

        // THE FIX: Use Animated.sequence to force a pause every time it hits the start
        animationRef.current = Animated.sequence([
          Animated.delay(delay), // Pauses at the start position
          Animated.timing(translateX, {
            toValue: -distance,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]);

        animationRef.current.start(({ finished }) => {
          if (finished && active) {
            animate(); // Instantly loop back and trigger the pause again
          }
        });
      };

      animate(); // Start the loop immediately (it will hit the delay first)
    } else {
      // If paused or short text, gently slide back to start
      Animated.timing(translateX, {
        toValue: 0,
        duration: isMeasured ? 300 : 0,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      translateX.stopAnimation();
    };
  }, [
    active,
    shouldAnimate,
    containerWidth,
    textWidth,
    text,
    delay,
    speed,
    gap,
  ]);

  return (
    <View
      style={[styles.marqueeOuter, containerStyle]}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* HIDDEN MEASUREMENT VIEW */}
      <View style={styles.hiddenMeasureContainer} pointerEvents="none">
        <Text
          key={text}
          numberOfLines={1}
          style={[textStyle, { alignSelf: 'flex-start' }]}
          onLayout={e =>
            setMeasurement({ text, width: e.nativeEvent.layout.width })
          }
        >
          {text}
        </Text>
      </View>

      {/* VISIBLE ANIMATED VIEW */}
      <Animated.View
        style={[styles.marqueeRow, { transform: [{ translateX }] }]}
      >
        {/* TEXT 1 */}
        <Text
          numberOfLines={1}
          style={[
            textStyle,
            {
              width: !isMeasured
                ? 9999
                : shouldAnimate
                ? textWidth
                : containerWidth,
            },
          ]}
        >
          {text}
        </Text>

        {/* TEXT 2 (DUPLICATE) - Only renders if the text needs to scroll */}
        {shouldAnimate && (
          <>
            <View style={{ width: gap }} />
            <Text numberOfLines={1} style={[textStyle, { width: textWidth }]}>
              {text}
            </Text>
          </>
        )}
      </Animated.View>
    </View>
  );
};

export default MarqueeText;

const styles = StyleSheet.create({
  marqueeOuter: {
    width: '100%',
    overflow: 'hidden',
  },

  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  hiddenMeasureContainer: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    zIndex: -1,
    width: 10000, // Parent provides infinite space to prevent wrapping...
  },
});
