import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../context/ThemeContext';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useCredits } from '../../context/CreditContext';

import SongImage from '../../components/SongImage';

import RNFS from 'react-native-fs';
import {
  createAiJobWorkspace,
  saveAiJob,
  saveAiStem,
} from '../../storage/storage';

import {
  uploadSongForSeparation,
  waitForJobCompletion,
  getSeparationStems,
  downloadAndStoreStems,
  deleteBackendJob,
} from '../../services/aiService';

const GAP = 12;
const NUM_COLUMNS = 4;
const CONTAINER_PADDING = 12;
const { width } = Dimensions.get('window');

const ITEM_WIDTH = Math.floor(
  (width - CONTAINER_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
);

const getFileNameFromUri = uri => {
  if (!uri) return `song_${Date.now()}.mp3`;
  const clean = uri.split('?')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || `song_${Date.now()}.mp3`;
};

const normalizeFileUri = uri => {
  if (!uri) return '';
  if (uri.startsWith('file://') || uri.startsWith('content://')) return uri;
  return `file://${uri}`;
};

const toLocalFsPath = uri => {
  if (!uri) return '';
  if (uri.startsWith('file://')) return uri.replace('file://', '');
  if (uri.startsWith('content://')) return null;
  return uri;
};

const AiSelectSongScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const { allSongs } = usePlayer();
  const { isFancyMode } = useTheme();
  const { user, creditsRemaining } = useAuth();
  const { consumeCredit, refundCredit } = useCredits();

  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [loadingState, setLoadingState] = useState('idle'); // idle | uploading | processing | downloading | saving
  const [loadingText, setLoadingText] = useState('');

  const avatar =
    user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const ImgBg = isFancyMode ? '#000000dc' : '#fff';
  const searchBg = isFancyMode ? '#2C2C2C' : '#e4e4e4ff';
  const borderColorSelected = isFancyMode ? '#FFF700' : '#ff0026';
  const borderColorDefault = '#474747';
  const subText = isFancyMode ? '#A0A0A0' : '#3e3e3e';

  const filteredSongs = useMemo(() => {
    if (!query.trim()) return allSongs || [];
    const lower = query.toLowerCase();

    return (allSongs || []).filter(song => {
      const titleMatch = song.title?.toLowerCase().includes(lower);
      const artistMatch =
        song.artist?.toLowerCase().includes(lower) ||
        song.description?.toLowerCase().includes(lower) ||
        song.artistCollection?.toLowerCase().includes(lower);
      return titleMatch || artistMatch;
    });
  }, [query, allSongs]);

  const getButtonLabel = () => {
    if (!selectedSong) return 'Select .mp3 music file';
    if (loadingState === 'uploading') return 'Processing...';
    if (loadingState === 'processing') return 'Extracting Stem...';
    if (loadingState === 'downloading') return 'On the way...';
    if (loadingState === 'saving') return 'Saving...';
    return 'Stem the Selected Song';
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedSong?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.songBtn,
          {
            borderColor: isSelected ? borderColorSelected : 'transparent',
            borderWidth: isSelected ? 2 : 0,
            padding: isSelected ? 3 : 0,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => {
          Keyboard.dismiss();
          setSelectedSong(item);
        }}
      >
        <View style={styles.songImgWrap}>
          <SongImage
            uri={item.artwork}
            style={[styles.songImg, { backgroundColor: ImgBg }]}
          />
        </View>

        <Text style={[styles.songName, { color: textColor }]} numberOfLines={2}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const handleStartStem = async () => {
    if (!selectedSong) {
      Alert.alert('Select a song', 'Please choose one song first.');
      return;
    }

    if (!user) {
      navigation.navigate('Login');
      return;
    }

    if (Number(creditsRemaining || 0) <= 0) {
      navigation.navigate('AiPlan');
      return;
    }

    let remoteJobId = null;
    let creditReserved = false;

    try {
      setLoadingState('uploading');
      setLoadingText('Uploading song to AI engine...');

      const fileUri = normalizeFileUri(selectedSong.url);
      const songFileName = getFileNameFromUri(
        selectedSong.url || selectedSong.title,
      );

      const backendLocalPath = toLocalFsPath(fileUri);
      if (!backendLocalPath) {
        throw new Error(
          'This song path is not a direct local file path. Save the song into app storage first, then extract it.',
        );
      }

      const backendJob = await uploadSongForSeparation({
        uri: fileUri,
        name: songFileName,
        type: 'audio/mpeg',
        modelName: 'htdemucs',
        device: 'cuda',
      });

      remoteJobId =
        backendJob?.job_id ||
        backendJob?.id ||
        backendJob?.jobId ||
        backendJob?.jobID;

      if (!remoteJobId) {
        throw new Error('Backend did not return a job id.');
      }

      // Deduct 1 credit only after the job has been accepted
      await consumeCredit({
        job_id: remoteJobId,
        description: `Stem extraction started for ${selectedSong.title}`,
      });
      creditReserved = true;

      setLoadingState('processing');
      setLoadingText('Extracting Vocals, Bass, Drum & Others...');

      const finishedJob = await waitForJobCompletion(remoteJobId, {
        intervalMs: 3000,
      });

      if (finishedJob?.status !== 'done') {
        throw new Error(
          finishedJob?.error_message || 'Stem extraction failed.',
        );
      }

      setLoadingState('downloading');
      setLoadingText('Downloading stems to your device...');

      const stemsResp = await getSeparationStems(remoteJobId);
      const stemsMap = stemsResp?.stems || {};

      setLoadingState('saving');
      setLoadingText('Saving extracted files locally...');

      const workspace = await createAiJobWorkspace(remoteJobId);

      const localOriginalPath = `${workspace.inputDir}/${songFileName}`;
      if (await RNFS.exists(backendLocalPath)) {
        await RNFS.copyFile(backendLocalPath, localOriginalPath);
      }

      const downloaded = await downloadAndStoreStems({
        jobId: remoteJobId,
        stemsMap,
        stemsDir: workspace.stemsDir,
      });

      for (const [stemName, stemPath] of Object.entries(downloaded)) {
        const exists = await RNFS.exists(stemPath);
        console.log(`Stem check ${stemName}:`, stemPath, exists);
      }

      await saveAiJob({
        job_id: remoteJobId,
        song_id: selectedSong.id,
        song_title: selectedSong.title,
        song_artist: selectedSong.description || '',
        artwork: selectedSong.artwork || '',
        original_path: localOriginalPath,
        backend_job_id: remoteJobId,
        status: 'done',
        processing_status: 'done',
        model_name: 'htdemucs',
        credits_spent: 1,
        local_job_dir: workspace.root,
        local_zip_path: workspace.zipPath,
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      });

      for (const stemName of Object.keys(downloaded)) {
        await saveAiStem({
          job_id: remoteJobId,
          stem_name: stemName,
          remote_url: '',
          local_path: downloaded[stemName],
          volume: 1,
          duration: 0,
          created_at: new Date().toISOString(),
        });
      }

      await deleteBackendJob(remoteJobId);

      setLoadingState('idle');
      setLoadingText('');

      navigation.navigate('AiMixStem', { jobId: remoteJobId });
    } catch (e) {
      console.warn('Stem extraction error', e);

      if (creditReserved && remoteJobId) {
        try {
          await refundCredit({
            job_id: remoteJobId,
            description: `Refund after failed extraction for ${
              selectedSong?.title || 'song'
            }`,
          });
        } catch (refundErr) {
          console.warn('Refund failed:', refundErr);
        }
      }

      setLoadingState('idle');
      setLoadingText('');
      Alert.alert('Extraction failed', e?.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>

        <View style={styles.headingBtns}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AiExtractedSong')}
          >
            <Feather name="file-text" size={24} color={textColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.aiPlanBtn, { borderColor: textColor }]}
            onPress={() => navigation.navigate('AiPlan')}
          >
            <Text style={[styles.aiPlanBtnText, { color: textColor }]}>
              {creditsRemaining > 0 ? creditsRemaining : 0}
            </Text>
            <Image
              source={require('../../assets/DollarCoin.png')}
              style={styles.coinLogo}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor: textColor }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image source={{ uri: avatar }} style={styles.avatar} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 10, gap: 5 }}>
        <Text style={[styles.heading, { color: textColor }]}>Select Song</Text>

        <Text style={[styles.subHeading, { color: subText }]}>
          Choose a track for AI stem extraction
        </Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: searchBg }]}>
        <Feather name="search" size={20} color={textColor} />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search and select .mp3 files"
          placeholderTextColor="#626262"
          style={[styles.input, { color: textColor }]}
          autoFocus
        />

        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Feather name="x" size={20} color={textColor} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredSongs}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={() => Keyboard.dismiss()}
        ListEmptyComponent={
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Text style={styles.emptyText}>
              No songs found, first add songs in home screen
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.selectBtn,
          {
            marginBottom: insets.bottom + 20,
            borderColor:
              selectedSong && loadingState === 'idle'
                ? borderColorSelected
                : borderColorDefault,
          },
        ]}
        onPress={handleStartStem}
        activeOpacity={0.85}
        disabled={loadingState !== 'idle' || !selectedSong}
      >
        {loadingState === 'idle' ? (
          <Text style={styles.selectBtnText}>{getButtonLabel()}</Text>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <ActivityIndicator color="#FFF700" />
            <Text style={styles.selectBtnText}>{getButtonLabel()}</Text>
          </View>
        )}

        {!!loadingText && <Text style={styles.loadingText}>{loadingText}</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default AiSelectSongScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#5f5f5f',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 20,
    fontWeight: '500',
  },
  headingBtns: {
    gap: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 45,
    height: 45,
    marginTop: 18,
    borderRadius: 15,
  },
  aiPlanBtn: {
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  aiPlanBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  coinLogo: {
    width: 23,
    height: 28,
  },
  avatarContainer: {
    borderWidth: 1,
    borderRadius: 100,
    padding: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 48,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchBox: {
    gap: 10,
    height: 43,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
    justifyContent: 'flex-start',
  },
  listContainer: {
    paddingBottom: 110,
  },
  emptyText: {
    fontSize: 15,
    color: '#606060',
    textAlign: 'center',
  },
  songBtn: {
    width: ITEM_WIDTH,
    borderRadius: 12,
  },
  songImgWrap: {
    borderRadius: 10,
  },
  songImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#000000',
  },
  songName: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  selectBtn: {
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    padding: 12,
    borderWidth: 2,
    borderRadius: 80,
    alignItems: 'center',
    marginHorizontal: 12,
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  selectBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 4,
    fontSize: 12,
    color: '#D7D7D7',
  },
});
