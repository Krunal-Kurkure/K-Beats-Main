import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Feather from 'react-native-vector-icons/Feather';
import Icon from 'react-native-vector-icons/Ionicons';

import SongImage from '../../components/SongImage';
import { useTheme } from '../../context/ThemeContext';
import { deleteAiJob, getAiJobs } from '../../storage/storage';

const AiExtractedSongScreen = () => {
  const navigation = useNavigation();
  const { isFancyMode } = useTheme();

  const [jobs, setJobs] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);

  const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffdc' : '#000';
  const cardBg = isFancyMode ? '#222' : '#ebebf3';
  const subText = isFancyMode ? '#A0A0A0' : '#3e3e3e';

  const loadJobs = useCallback(async () => {
    const rows = await getAiJobs();
    setJobs(rows || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs]),
  );

  const handleDelete = async jobId => {
    Alert.alert(
      'Delete extracted song?',
      'This will remove the song and all local stem files permanently from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAiJob(jobId);
            await loadJobs();
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const artwork = item.artwork || item.song_artwork || '';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => navigation.navigate('AiMixStem', { jobId: item.job_id })}
      >
        <View style={styles.cardTop}>
          <SongImage uri={artwork} style={styles.cardImage} />
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.title, { color: textColor }]}
              numberOfLines={1}
            >
              {item.song_title || 'Unknown Song'}
            </Text>
            <Text style={[styles.artist, { color: subText }]} numberOfLines={1}>
              {item.song_artist || 'Local extraction'}
            </Text>
            <Text style={[styles.status, { color: subText }]}>
              Song Extracted : {item.processing_status || item.status || 'Done'}
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color={textColor} />
          {deleteMode && (
            <TouchableOpacity
              onPress={() => handleDelete(item.job_id)}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={16} color="#ff4d4d" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
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

        <Text style={[styles.headerTitle, { color: textColor }]}>
          Extracted Songs
        </Text>

        <TouchableOpacity onPress={() => setDeleteMode(prev => !prev)}>
          <Feather name="more-vertical" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.subHeading, { color: subText }]}>
        All your AI-generated stems in one place.
      </Text>

      <FlatList
        data={jobs}
        keyExtractor={item => item.job_id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text style={{ color: subText }}>No extracted songs yet.</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default AiExtractedSongScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignItems: 'center',
    borderColor: '#5f5f5f',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  backButton: {
    width: 45,
    height: 45,
    marginTop: 18,
    borderRadius: 15,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '500',
    marginVertical: 10,
  },
  card: {
    borderRadius: 13,
    padding: 10,
    marginBottom: 10,
  },
  cardTop: {
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  artist: {
    fontSize: 11,
    marginTop: 2,
  },
  status: {
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    alignItems: 'center',
    gap: 5,
    borderColor: '#ff4d4d',
    padding: 6,
    backgroundColor: '#ff001e15',
    borderRadius: 8,
    borderWidth: 1,
  },
});
