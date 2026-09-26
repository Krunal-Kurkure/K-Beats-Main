import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --------------------------- ICONS IMPORTS -----------------------------------
import Feather from 'react-native-vector-icons/Feather';

// ---------------------------- APP CONTEXT ---------------------------------
import { useTheme } from '../context/ThemeContext';

// ---------------------------- IMPORTS COMPONENTS ---------------------------------
import FAQAccordion from '../components/FAQAccordion';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WidgetSettingsSection from '../components/WidgetSettingsSection';

const Setting = ({ navigation }) => {
  // --------------------------- THEMES HELPERS ---------------------------
  const {
    isFancyMode,
    toggleTheme,
    isAnimationEnabled,
    toggleAnimation,
    toggleView,
    showGrid,
  } = useTheme();
  const backgroundColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000000';
  const iconColor = isFancyMode ? '#ffffffdc' : '#2b2b2b';
  const borderColor = isFancyMode ? '#4f4f4f' : '#696969';
  const subTextColor = isFancyMode ? '#A0A0A0' : '#4f4f4f';
  const accentColor = isFancyMode ? '#ff4d4d' : '#ff002b';
  const rowBackgroundColor = isFancyMode ? '#2e2e2e' : '#F2F2F7';

  // --------------------------- URL HELPER FUNCTION --------------------------------------
  const openYouTubeView = () => {
    // Replace this URL with your actual YouTube video link
    Linking.openURL('https://www.youtube.com/watch?v=YOUR_VIDEO_ID').catch(
      err => console.error("Couldn't load page", err),
    );
  };

  // --------------------------- URL HELPER FUNCTION FOR ICONS ---------------------------
  const openLink = url => {
    Linking.openURL(url);
  };

  const resetGuide = async () => {
    try {
      // Remove the flag so it triggers next time Home loads
      await AsyncStorage.removeItem('@has_seen_guide');

      Alert.alert(
        'Guide Reset',
        'The quick guide will show up when you return to the Home screen.',
        [{ text: 'Go to Home', onPress: () => navigation.navigate('Home') }],
      );
    } catch (error) {
      console.error('Error resetting guide:', error);
    }
  };

  const [isEnabled, setIsEnabled] = useState(false);
  const [isYTEnabled, setIsYTEnabled] = useState(false);

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    resetGuide(); // 🔑 call your function here
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* ---------------------------------- HEADER ------------------------------ */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{ paddingVertical: 5, paddingRight: 15 }}
        >
          <Feather name="arrow-left" size={24} color={textColor} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textColor }]}>
          Setting & Info
        </Text>
      </View>

      {/* ------------------- MAIN CONTENT ---------------------------- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ------------------------- BUTTONS ------------------------- */}

        {/* --- BUTTON 1: THEME TOGGLE --- */}
        <TouchableOpacity
          style={[
            styles.settingRowButton,
            { backgroundColor: rowBackgroundColor },
          ]}
          activeOpacity={0.7}
          onPress={toggleTheme}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <Feather
              name={isFancyMode ? 'moon' : 'sun'}
              size={24}
              color={textColor}
            />
            <Text style={[styles.settingRowText, { color: textColor }]}>
              {isFancyMode ? 'Dark Theme' : 'Light Theme'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#919191' }}
            thumbColor={isFancyMode ? '#f7df02' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            value={isFancyMode}
            onValueChange={toggleTheme}
          />
        </TouchableOpacity>

        {/* --- BUTTON 2: ANIMATION TOGGLE --- */}
        <TouchableOpacity
          style={[
            styles.settingRowButton,
            {
              backgroundColor: isFancyMode ? '#2e2e2e5e' : '#F2F2F7',
            },
          ]}
          activeOpacity={0.7}
          onPress={toggleAnimation}
          disabled={isFancyMode} // Absolutely prevents clicking the row if Dark Theme is ON
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <Feather
              // Shows a lock icon when disabled, otherwise shows activity/minus
              name={
                isFancyMode ? 'lock' : isAnimationEnabled ? 'activity' : 'minus'
              }
              size={24}
              color={isFancyMode ? '#ffffff48' : '#000000'}
            />
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              <Text
                style={[
                  styles.settingRowText,
                  { color: isFancyMode ? '#ffffff48' : '#000000' },
                ]}
              >
                {
                  /* CRITICAL LOGIC: Changes text based on theme lock */
                  isFancyMode
                    ? 'Works in Light Theme'
                    : isAnimationEnabled
                    ? 'Animations On'
                    : 'Animations Off'
                }
              </Text>
              <Text style={{ fontSize: 10, color: '#5b5b5b' }}>
                BG colors Animates in Others Screens
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#919191' }}
            thumbColor={isAnimationEnabled ? '#f7df02' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            value={isAnimationEnabled}
            onValueChange={toggleAnimation}
            disabled={isFancyMode} // Prevents dragging the switch if Dark Theme is ON
          />
        </TouchableOpacity>

        {/* --- BUTTON 3: GRID AND LIST LAYOUT --- */}
        <TouchableOpacity
          style={[
            styles.settingRowButton,
            { backgroundColor: rowBackgroundColor },
          ]}
          activeOpacity={0.7}
          onPress={toggleView}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <Feather
              name={showGrid ? 'grid' : 'list'}
              size={24}
              color={textColor}
            />
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'flex-start',
              }}
            >
              <Text style={[styles.settingRowText, { color: textColor }]}>
                {showGrid ? 'Songs in Grid Layout' : 'Songs in List Layout'}
              </Text>
              <Text style={{ fontSize: 10, color: subTextColor }}>
                When button off songs shows in list layout
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#919191' }}
            thumbColor={showGrid ? '#f7df02' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            value={showGrid}
            onValueChange={toggleView}
          />
        </TouchableOpacity>

        {/* --- BUTTON 4: SHOWS APP GUIDE TO HOME SCREEN --- */}
        <TouchableOpacity
          style={[
            styles.settingRowButton,
            { backgroundColor: rowBackgroundColor },
          ]}
          activeOpacity={0.7}
          onPress={handleToggle} // row press also toggles + calls resetGuide
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <Feather name="info" size={24} color={textColor} />
            <Text style={[styles.settingRowText, { color: textColor }]}>
              Show App Guide Again
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#919191' }}
            thumbColor={isEnabled ? '#f7df02' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleToggle} // switch also triggers resetGuide
            value={isEnabled}
          />
        </TouchableOpacity>

        {/* --- BUTTON 5: NAVIGATES TO YOUTUBE FOR OVERVIEW --- */}
        <TouchableOpacity
          style={[
            styles.settingRowButton,
            { backgroundColor: rowBackgroundColor },
          ]}
          activeOpacity={0.7}
          onPress={() => openYouTubeView()}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <Feather name="youtube" size={24} color="#FF0000" />

            <Text style={[styles.settingRowText, { color: textColor }]}>
              Watch App Overview
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#919191' }}
            thumbColor={isYTEnabled ? '#f7df02' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={() => openYouTubeView()}
            value={isYTEnabled}
          />
        </TouchableOpacity>

        {/* -- */}
        <WidgetSettingsSection />
        {/* -- */}

        {/* ------------------------------- INFO HEADER ----------------------------------- */}
        <View
          style={[styles.sectionHeader, { borderBottomColor: borderColor }]}
        >
          <Text style={[styles.sectionHeaderText, { color: textColor }]}>
            K-Beats Info
          </Text>
        </View>

        {/* --- Info Card --- */}
        <View
          style={[styles.infoCard, { backgroundColor: rowBackgroundColor }]}
        >
          <Text style={[styles.infoTitle, { color: textColor }]}>
            K-Beats: The Music Player
          </Text>
          <Text
            style={[styles.infoDesc, { color: subTextColor, marginBottom: 15 }]}
          >
            K‑Beats is your personal hub for playing, managing, and controlling
            the music already stored on your device. With its clean interface
            and smart features, it helps you organize and enjoy your local
            library — without online streaming or bundled tracks.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            1. Smart Import
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Import single tracks or multiple-import entire of MP3s files.
            Automatically captures song name, Direct add songs into Collections
            & edit metadata seamlessly from the home screen.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            2. Powerful Home Screen
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Organize tracks, edit metadata, trim, or delete them. Features an{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Android-exclusive Floating Mini-Player
            </Text>{' '}
            and a bottom song card that opens the main player with a tap.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            3. Custom Collections
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Create Collections using the + Icon at the bottom of the app logo
            </Text>
            , Group your favorite songs by vibe (e.g., "Love" or "Workout").
            Deleting a collection is{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>Safe</Text>
            — your songs simply return to the main library.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            4. Artist Profiles
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Similar to collections, create rich, dedicated artist profiles. Add
            immersive background images, date of birth, and genres in the Artist
            screen. This data seamlessly links to the music player's sliding
            carousel.{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Ensure{' '}
            </Text>
            the song’s artist name matches the artist collection name so it
            appears correctly in the main player carousel. During song import,
            always use the same artist name as the artist collection for proper
            linking as per the songs and the song of artist.
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            5. High-Fidelity Player
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            To enter the main player, simply tap the bottom music card. Enjoy a
            highly detailed UI featuring grid or list views, sleep timers, and
            intuitive bottom controls. Look for the animated music note to
            access lyrics and the main player carousel for artist data.
          </Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderColor: borderColor,
              paddingVertical: 8,
            }}
          />
          <Text
            style={{
              color: accentColor,
              paddingVertical: 5,
            }}
          >
            Note :{' '}
            <Text style={[styles.pointText, { color: subTextColor }]}>
              The first time you use the mini player, you’ll need to grant
              permission on your Android device. Tap the mini player icon, and
              the “Display over other apps” screen will appear. Allow access for
              K‑Beats, then return to the app and tap the mini player icon again
              to enable it properly.
            </Text>
          </Text>

          <Text style={[styles.pointTitle, { color: textColor }]}>
            6. Interactive Lyrics
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            Import custom text lyrics and use our{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              Real-Time Sync Tool
            </Text>
            . Tap line-by-line as the song plays to save the exact timings for
            future playback.
          </Text>
        </View>

        {/* -------------------------------------- WHY K-BEATS SECTION ------------------------------ */}
        <View
          style={[styles.sectionHeader, { borderBottomColor: borderColor }]}
        >
          <Text style={[styles.sectionHeaderText, { color: textColor }]}>
            Why K-Beats
          </Text>
        </View>
        <View
          style={[styles.infoCard, { backgroundColor: rowBackgroundColor }]}
        >
          <Text style={[styles.infoTitle, { color: textColor }]}>
            K-Beats: The Music Player
          </Text>
          <Text
            style={[styles.infoDesc, { color: subTextColor, marginBottom: 15 }]}
          >
            K-Beats is designed to offer a smooth and intuitive music playback
            experience with high-quality controls and a user-friendly interface.
          </Text>
          <Text style={[styles.pointText, { color: subTextColor }]}>
            The app works completely offline and includes{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              no ads or subscriptions,
            </Text>{' '}
            giving users a simple and uninterrupted way to enjoy their
            downloaded or personally recorded music.
          </Text>

          <Text
            style={[styles.pointText, { color: subTextColor, marginTop: 15 }]}
          >
            We understand the importance of respecting rights and ownership.
            K-Beats does{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              not provide music, host content, or store user audio files or
              metadata
            </Text>{' '}
            on its servers. Any songs added to the app remain on the user’s
            device and stay under the user’s control. Our role is only to
            provide playback functionality and a better listening experience for
            personal use.
          </Text>

          <Text
            style={[styles.pointText, { color: subTextColor, marginTop: 15 }]}
          >
            K-Beats is intended for users who prefer to listen to their own
            music offline, at their convenience. We do not encourage{' '}
            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
              unauthorized downloads or distribution of copyrighted content.
            </Text>{' '}
            Instead, we aim to support a reliable, private, and enjoyable music
            player experience for everyday listening
          </Text>
        </View>

        {/* ----------------------------------- FAQS SECTION -------------------------- */}
        <View
          style={[styles.sectionHeader, { borderBottomColor: borderColor }]}
        >
          <Text style={[styles.sectionHeaderText, { color: textColor }]}>
            FAQ'S
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <FAQAccordion />
        </View>

        {/* -------------------------- SUPPORT SECTION ---------------------------  */}
        <View style={styles.connectContainer}>
          <Text style={[styles.connectText, { color: textColor }]}>
            Visit our website :{' '}
            <Text
              style={styles.connectLink}
              onPress={() => openLink('https://yourwebsite.com')}
            >
              K-Beats.com
            </Text>
          </Text>

          <Text style={[styles.connectHeading, { color: textColor }]}>
            Connect with us
          </Text>

          <View style={styles.connectIconRow}>
            <TouchableOpacity
              onPress={() =>
                openLink('https://www.instagram.com/krunal.a.kurkure')
              }
            >
              <Feather
                name="instagram"
                size={24}
                style={[styles.connectIcon, { color: iconColor }]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openLink('https://github.com/Krunal-Kurkure')}
            >
              <Feather
                name="github"
                size={24}
                style={[styles.connectIcon, { color: iconColor }]}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                openLink('https://www.linkedin.com/in/krunal-arvind-kurkure')
              }
            >
              <Feather
                name="linkedin"
                size={24}
                style={[styles.connectIcon, { color: iconColor }]}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openLink('https://youtube.com')}>
              <Feather
                name="youtube"
                size={26}
                style={[styles.connectIcon, { color: iconColor }]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Setting;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingTop: 15,
    paddingBottom: 40,
  },
  settingRowButton: {
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },
  settingRowText: {
    fontSize: 17,
    fontWeight: '500',
  },

  sectionHeader: {
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeaderText: {
    fontSize: 14,
    opacity: 0.8,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoCard: {
    padding: 20,
    borderRadius: 14,
  },
  infoTitle: {
    fontSize: 20,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  pointTitle: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '700',
  },
  pointText: {
    fontSize: 14,
    lineHeight: 22,
  },
  faqsHead: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '700',
  },

  connectContainer: {
    paddingTop: 50,
    alignItems: 'center',
  },
  connectText: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  connectLink: {
    color: '#4da6ff',
    textDecorationLine: 'underline',
  },
  connectHeading: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  connectIconRow: {
    gap: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  connectIcon: {
    marginHorizontal: 12,
  },
});
