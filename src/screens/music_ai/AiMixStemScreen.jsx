import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import Slider from '@react-native-community/slider';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import Icon from 'react-native-vector-icons/Ionicons';

import SongImage from '../../components/SongImage';
import { useAuth } from '../../context/AuthContext';
import { useStemPlayer } from '../../context/StemPlayerContext';
import { useTheme } from '../../context/ThemeContext';
import { getAiJobBundle } from '../../storage/storage';

const { width, height } = Dimensions.get('screen');

const formatTime = s => {
  const secs = Number(s || 0);
  const mins = Math.floor(secs / 60);
  const rem = Math.floor(secs % 60);
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
};

const AiMixStemScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const { isFancyMode } = useTheme();
  const {
    currentJob,
    isReady,
    isPlaying,
    position,
    duration,
    volumeMap,
    loadStemSession,
    togglePlay,
    seekAll,
    setStemVolume,
    releaseAll,
    loadError,
  } = useStemPlayer();

  const { creditsRemaining } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  const jobId = route.params?.jobId;

  const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const iconColor = isFancyMode ? '#fff' : '#000';

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        setLoading(true);
        setErrorText('');

        if (!jobId) {
          setErrorText('Missing job id.');
          setLoading(false);
          return;
        }

        const bundle = await getAiJobBundle(jobId);
        if (!bundle) {
          throw new Error('Job not found in local database.');
        }

        const stemsObject = {
          vocals: '',
          drums: '',
          bass: '',
          other: '',
        };

        const rows = bundle.stems || [];
        rows.forEach(row => {
          const name = String(row.stem_name || '').toLowerCase();
          const path = row.local_path || '';

          if (name === 'vocals') stemsObject.vocals = path;
          if (name === 'drums') stemsObject.drums = path;
          if (name === 'bass') stemsObject.bass = path;
          if (name === 'other' || name === 'others') stemsObject.other = path;
        });

        const normalizedBundle = {
          ...bundle,
          stems: stemsObject,
        };

        await loadStemSession(normalizedBundle);
      } catch (e) {
        console.warn('AiMixStem load error:', e);
        setErrorText(e?.message || 'Unable to load stems.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    boot();

    return () => {
      mounted = false;
      releaseAll();
    };
    // Only run when the job id changes.
  }, [jobId]);

  const currentArtwork = useMemo(() => {
    return (
      currentJob?.artwork ||
      currentJob?.song_artwork ||
      'https://via.placeholder.com/300'
    );
  }, [currentJob]);

  const visibleError = errorText || loadError;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FFF700" />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Loading stems...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (visibleError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
        <View style={styles.loadingBox}>
          <Text style={[styles.errorText, { color: textColor }]}>
            {visibleError}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AiExtractedSong')}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!isReady) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
        <View style={styles.loadingBox}>
          <Text style={[styles.errorText, { color: textColor }]}>
            Stems are not ready.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>

        <Text style={[styles.heading, { color: textColor }]}>Mix Stems</Text>

        <View style={styles.headerBtns}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AiExtractedSong')}
          >
            <Feather name="file-text" size={24} color={textColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => navigation.navigate('AiPlan')}
          >
            <Text style={styles.aiBtnText}>
              {/* {currentJob?.credits_spent || 1} */}
              {creditsRemaining > 0 ? creditsRemaining : 0}
            </Text>
            <Image
              source={require('../../assets/DollarCoin.png')}
              style={styles.coinLogo}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 150 }}
        style={{ gap: 10, paddingTop: 20 }}
      >
        <View style={styles.songCard}>
          {/* /extracted songs / */}
          <View>
            <View style={styles.extractedSongCardBtn}>
              <Image
                source={require('./../../assets/aiLogoMain.png')}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            </View>
          </View>

          <SongImage
            uri={currentArtwork}
            style={[styles.songImg, { borderColor: textColor }]}
          />
          <Text
            numberOfLines={1}
            style={[styles.songName, { color: textColor }]}
          >
            {currentJob?.song_title || 'Unknown Song'}
          </Text>
          <Text numberOfLines={1} style={styles.songDesc}>
            {currentJob?.song_artist || 'AI stem extraction'}
          </Text>
        </View>

        <View style={styles.sliderCard}>
          <FontAwesome6
            name="microphone"
            style={styles.sliderIcon}
            size={22}
            color={textColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sliderHeading, { color: textColor }]}>
              Vocals
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={volumeMap.vocals}
              onValueChange={v => setStemVolume('vocals', v)}
              minimumTrackTintColor={isFancyMode ? '#ff0048' : '#000'}
              maximumTrackTintColor={
                isFancyMode ? 'rgba(255,255,255,0.55)' : '#b6b6b6ff'
              }
              thumbTintColor={isFancyMode ? '#ff0048' : '#000'}
            />
          </View>
        </View>

        <View style={styles.sliderCard}>
          <FontAwesome6
            name="drum"
            style={styles.sliderIcon}
            size={22}
            color={textColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sliderHeading, { color: textColor }]}>
              Drums
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={volumeMap.drums}
              onValueChange={v => setStemVolume('drums', v)}
              minimumTrackTintColor={isFancyMode ? '#ff0048' : '#000'}
              maximumTrackTintColor={
                isFancyMode ? 'rgba(255,255,255,0.55)' : '#b6b6b6ff'
              }
              thumbTintColor={isFancyMode ? '#ff0048' : '#000'}
            />
          </View>
        </View>

        <View style={styles.sliderCard}>
          <FontAwesome6
            name="podcast"
            style={styles.sliderIcon}
            size={22}
            color={textColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sliderHeading, { color: textColor }]}>
              Bass
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={volumeMap.bass}
              onValueChange={v => setStemVolume('bass', v)}
              minimumTrackTintColor={isFancyMode ? '#ff0048' : '#000'}
              maximumTrackTintColor={
                isFancyMode ? 'rgba(255,255,255,0.55)' : '#b6b6b6ff'
              }
              thumbTintColor={isFancyMode ? '#ff0048' : '#000'}
            />
          </View>
        </View>

        <View style={styles.sliderCard}>
          <FontAwesome6
            name="sliders"
            style={styles.sliderIcon}
            size={22}
            color={textColor}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sliderHeading, { color: textColor }]}>
              Others
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              value={volumeMap.other}
              onValueChange={v => setStemVolume('other', v)}
              minimumTrackTintColor={isFancyMode ? '#ff0048' : '#000'}
              maximumTrackTintColor={
                isFancyMode ? 'rgba(255,255,255,0.55)' : '#b6b6b6ff'
              }
              thumbTintColor={isFancyMode ? '#ff0048' : '#000'}
            />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.SongTime,
          { paddingBottom: insets.bottom + 35, backgroundColor: bgColor },
        ]}
      >
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={duration || 0}
          value={position || 0}
          onSlidingComplete={seekAll}
          minimumTrackTintColor={isFancyMode ? '#ff0048' : '#000'}
          maximumTrackTintColor={
            isFancyMode ? 'rgba(255,255,255,0.55)' : '#b6b6b6ff'
          }
          thumbTintColor={isFancyMode ? '#ff0048' : '#000'}
        />
        <View style={styles.controlsRow}>
          <Text style={[styles.timeText, { color: textColor }]}>
            {formatTime(position)}
          </Text>

          <TouchableOpacity
            style={[styles.PlayBtn, { borderColor: iconColor }]}
            onPress={togglePlay}
          >
            <FontAwesome6
              name={isPlaying ? 'pause' : 'play'}
              size={26}
              color={iconColor}
              style={{ paddingLeft: isPlaying ? 0 : 4 }}
            />
          </TouchableOpacity>

          <Text style={[styles.timeText, { color: textColor }]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AiMixStemScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 18,
    marginLeft: 55,
    fontWeight: '500',
  },
  headerBtns: {
    gap: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backButton: {
    width: 45,
    height: 45,
    marginTop: 18,
    borderRadius: 15,
  },
  aiBtn: {
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderColor: '#7e7e7e',
    backgroundColor: '#000',
  },
  aiBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
  },
  coinLogo: {
    width: 23,
    height: 28,
  },
  songCard: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractedSongCardBtn: {
    top: 5,
    width: 40,
    right: 70,
    height: 40,
    zIndex: 99,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  songImg: {
    width: 230,
    height: 230,
    borderWidth: 2,
    borderRadius: 20,
  },
  songName: {
    fontSize: 20,
    marginTop: 10,
    fontWeight: '500',
  },
  songDesc: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
    color: '#666666',
  },
  timeText: {
    fontSize: 12,
    width: 44,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  sliderCard: {
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  sliderIcon: {
    width: 26,
    textAlign: 'center',
    marginTop: 4,
  },
  sliderHeading: {
    fontSize: 14,
    marginLeft: 15,
    fontWeight: '500',
  },
  SongTime: {
    left: 0,
    right: 0,
    bottom: 0,
    position: 'absolute',
    paddingHorizontal: 25,
    justifyContent: 'space-between',
  },
  PlayBtn: {
    width: 65,
    height: 65,
    borderWidth: 2,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
