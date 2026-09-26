import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
// Enable animation for Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQAccordion = () => {
  const [activeIndex, setActiveIndex] = useState(null);

  const { isFancyMode } = useTheme();
  const rowBackgroundColor = isFancyMode ? '#2e2e2e' : '#F2F2F7';
  const textColor = isFancyMode ? '#ffffffdc' : '#000000';
  const subTextColor = isFancyMode ? '#A0A0A0' : '#4f4f4f';

  const faqs = [
    {
      question: '1. How do I add songs to App?',
      answer:
        'Hit the red + icon in home screen and you are able to import the all song info with mp3 file.',
    },
    {
      question: '2. How to open Main Player?',
      answer:
        'First you have to play song as the Bottom Card appears for song playing and then simply tap on it.',
    },
    {
      question: '3. How to create Normal & Artist Collection?',
      answer:
        'On the Home screen, below the app logo, tap the + icon to create collections. Your collections will then appear on the Home screen.',
    },
    {
      question:
        '4. How can I trim, arrange, or edit song information, and permanently delete a song from the app?',
      answer:
        'Open the song options (⋮) in Home Screen to trim audio, edit details, or rearrange tracks. To permanently delete a song from the app, select Remove Song and confirm.',
    },
    {
      question: '5. How can edit artist info?',
      answer:
        'After creating an Artist Collection (eg.Arijit Singh) on the Home Screen, you’ll see your artist name with an image displayed as a playlist. Tap on it to open the artist screen. Then tap the (⋮) menu to access the edit option. After saving, tap the (v) down arrow in the (eg.Arijit Singh) heading to view your saved details.',
    },
    {
      question: '6. How to open and edit lyrics?',
      answer:
        'Tap the bottom music card to open the main player. In the large player card, tap the music note icon to edit lyrics. You can sync lyrics with the song as it plays and save your changes for the best animated lyrics experience.',
    },
    {
      question: '7. How to open Mini Player?',
      answer:
        'Play a song and tap the icon on the Home screen. The mini player remains visible even when you leave the app, allowing you to use with other apps. Tap the mini player to expand it for mini controls. (Mini Player Only supports Android as IOS does not allowed Floating Players).',
    },
  ];

  const toggleItem = index => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <View style={styles.container}>
      {faqs.map((item, index) => {
        const isOpen = activeIndex === index;

        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            onPress={() => toggleItem(index)}
            style={[styles.card, { backgroundColor: rowBackgroundColor }]}
          >
            {/* Top Row (Question + Icon) */}
            <View style={styles.row}>
              <Text style={[styles.question, { color: textColor }]}>
                {item.question}
              </Text>

              {/* Arrow Icon */}
              <Feather
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={textColor}
              />
            </View>

            {/* Answer */}
            {isOpen && (
              <View style={styles.answerContainer}>
                <Text style={[styles.answer, { color: subTextColor }]}>
                  {item.answer}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default FAQAccordion;

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  card: {
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    paddingRight: 10,
  },
  icon: {
    fontSize: 18,
  },
  answerContainer: {
    marginTop: 10,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
});
