import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';


// ---------------- HELPER DATABASE STORAGE ----------------
import { getCollections, saveSong } from '../storage/storage';


// ---------------- IMAGE/FILE PACKAGE ---------------
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';


// ---------------- ICONS IMPORTS -------------------
import Icon from 'react-native-vector-icons/Ionicons';


// ---------------- IMPORTS COMPONENTS --------------
import MusicCard from '../components/MusicCard';
import SongImage from '../components/SongImage';


// ---------------- APP CONTEXT ----------------------
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';


const ImportSong = ({ navigation }) => {

  // ---------------- PLAYER CONTEXT CHILD'S ----------------
  const { refreshSongs } = usePlayer();

  // ---------------- INPUT SONG'S STATES ----------------------
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [multipleFiles, setMultipleFiles] = useState([]);

  // ---------------- COLLECTION SONG'S STATES ----------------------
  const [collections, setCollections] = useState([]);
  const [selectedCol, setSelectedCol] = useState(null);

  // ---------------- SAVE LOAGING STATES ----------------------
  const [loading, setLoading] = useState(false); // To show spinner during bulk import

  // ---------------- THEME CONTEXT CHILD'S ----------------
  const { isFancyMode } = useTheme();
  const bgColor = isFancyMode ? '#151515' : '#fff';
  const textColor = isFancyMode ? '#ffffffda' : '#000';
  const ListBtnBg = isFancyMode ? '#5f5f5f2d' : '#ffffffff';
  const PlayListCol = isFancyMode ? '#818181ff' : '#000000ff';

  useEffect(() => {
    getCollections().then(setCollections);
  }, []);

  // Check if we are ready to save (Control Header Icon Color)
  const isSingleReady = name.trim() !== '' && audioUri !== null;
  const isMultipleReady = multipleFiles.length > 0;
  const canSave = isSingleReady || isMultipleReady;

  // ---------------- PICK IMAGE FUNCTION ----------------
  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (result.assets) setImageUri(result.assets[0].uri);
  };

  // ---------------- PICK AUDIO FUNCTION ----------------
  const pickAudio = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.audio],
      });

      const src = res.fileCopyUri || res.uri || null;
      if (!src) {
        Alert.alert('Error', 'Could not access the selected file.');
        return;
      }

      // 1. Clear multiple files selection to avoid confusion
      setMultipleFiles([]);

      // 2. Prepare single file path
      const newPath = `${RNFS.DocumentDirectoryPath}/${Date.now()}-${res.name}`;

      // We don't copy yet, just store the source and destination for handleSave
      // But for Single file flow, your original code copied it immediately.
      // To keep it simple, we copy immediately for single file to show "Selected" state is valid.
      try {
        await RNFS.copyFile(src, newPath);
      } catch (copyErr) {
        try {
          const altSrc = src.startsWith('file://')
            ? src.replace('file://', '')
            : `file://${src}`;
          await RNFS.copyFile(altSrc, newPath);
        } catch (fallbackErr) {
          console.warn('copy fallback failed', fallbackErr);
          Alert.alert('Error', 'Could not copy audio file.');
          return;
        }
      }

      setAudioUri(`file://${newPath}`);
      // Auto-fill name if empty
      if (!name) {
        const rawName = res.name || '';
        setName(rawName.replace(/\.[^/.]+$/, ''));
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Could not pick audio file');
      }
    }
  };

  // ---------------- PICK MULTIPLE AUDIO FUNCTION ----------------
  const pickMultipleAudio = async () => {
    try {
      let results = null;

      if (typeof DocumentPicker.pickMultiple === 'function') {
        results = await DocumentPicker.pickMultiple({
          type: [DocumentPicker.types.audio],
        });
      } else {
        const res = await DocumentPicker.pick({
          type: [DocumentPicker.types.audio],
          allowMultiSelection: true,
        });
        results = Array.isArray(res) ? res : [res];
      }

      if (!results || results.length === 0) return;

      // 1. Clear single audio selection
      setAudioUri(null);
      setName('');

      // 2. Just store them in state. Do NOT save yet.
      setMultipleFiles(results);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.warn('pickMultiple error', err);
        Alert.alert('Error', 'Could not pick files.');
      }
    }
  };

  // ---------------- HANDLE SAVE FUNCTION ----------------
  const handleSave = async () => {
    if (!canSave) {
      if (multipleFiles.length === 0) {
        Alert.alert(
          'Missing Info',
          'Please add a Song Name and Audio File, or select multiple songs.',
        );
      }
      return;
    }

    setLoading(true);

    // ==========================================
    // CASE 1: MULTIPLE FILES IMPORT
    // ==========================================
    if (multipleFiles.length > 0) {
      let imported = 0;
      let failed = 0;

      for (let i = 0; i < multipleFiles.length; i++) {
        const file = multipleFiles[i];
        const src = file.fileCopyUri || file.uri || null;

        if (!src) {
          failed++;
          continue;
        }

        const nameFromFile = file.name || `song-${Date.now()}-${i}`;
        const titleOnly = nameFromFile.replace(/\.[^/.]+$/, '');

        // Destination path
        const destPath = `${
          RNFS.DocumentDirectoryPath
        }/${Date.now()}-${i}-${nameFromFile}`;

        // Perform Copy
        try {
          await RNFS.copyFile(src, destPath);
        } catch (copyErr) {
          try {
            const altSrc = src.startsWith('file://')
              ? src.replace('file://', '')
              : `file://${src}`;
            await RNFS.copyFile(altSrc, destPath);
          } catch (fallbackErr) {
            console.warn('Failed to copy file for import', file.name);
            failed++;
            continue;
          }
        }

        // Create DB Object
        const newSong = {
          id: `${Date.now()}-${i}`,
          url: `file://${destPath}`,
          title: titleOnly,
          artist: 'Unknown',
          description: '',
          artwork: null, // Multiple imports usually don't have one cover for all, but could add if needed
          collection: selectedCol || null,
          duration: 0,
        };

        try {
          await saveSong(newSong);
          imported++;
        } catch (e) {
          console.warn('Failed to save imported song row', e);
          failed++;
        }
      }

      await refreshSongs();
      setLoading(false);
      Alert.alert(
        'Import Finished',
        `Successfully imported: ${imported}\nFailed: ${failed}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }

    // ==========================================
    // CASE 2: SINGLE FILE IMPORT
    // ==========================================
    else {
      let finalImageUri = imageUri;

      if (imageUri) {
        try {
          const fileName = `${Date.now()}-cover.jpg`;
          const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
          await RNFS.copyFile(imageUri, destPath);
          finalImageUri = `file://${destPath}`;
        } catch (error) {
          console.error('Failed to save image permanently:', error);
        }
      }

      const newSong = {
        id: Date.now().toString(),
        url: audioUri,
        title: name,
        artist: 'Unknown',
        description: desc,
        artwork: finalImageUri,
        collection: selectedCol,
      };

      await saveSong(newSong);
      await refreshSongs();
      setLoading(false);
      navigation.goBack();
    }
  };

  // ---------------- MAIN USER INTERFACE ----------------
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar
        barStyle={isFancyMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* ---------------------- HEADER ---------------------- */}
      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={25} color={textColor} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: textColor }]}>
          Import Songs
        </Text>

        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Icon
              name="checkmark"
              size={25}
              // MAIN LOGIC: Green if ready (single or multi), otherwise text color
              color={canSave ? '#4CAF50' : textColor}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* ---------------------- MAIN SCROLL VIEW ---------------------- */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12 }}
      >
        {/* Image Picker (Only relevant for Single Import usually, but kept visible) */}
        <TouchableOpacity
          style={[
            styles.imageBox,
            { backgroundColor: ListBtnBg, borderColor: textColor },
          ]}
          onPress={pickImage}
        >
          {imageUri ? (
            <SongImage uri={imageUri} style={styles.fullImg} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Icon name="image-outline" size={35} color="#555" />
              <Text style={styles.grayText}>Upload Song Cover Image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* --- SINGLE FILE SECTION --- */}
        <Text style={[styles.label, { color: textColor }]}>Song Name</Text>
        <TextInput
          style={[styles.input, { borderColor: textColor, color: textColor }]}
          value={name}
          onChangeText={txt => {
            setName(txt);
            if (multipleFiles.length > 0) setMultipleFiles([]); // Reset multi if typing single
          }}
          placeholder="Enter song name"
          placeholderTextColor="#777"
          autoCapitalize='words'
        />

        <Text style={[styles.label, { color: textColor }]}>Artist Name</Text>
        <TextInput
          style={[styles.input, { borderColor: textColor, color: textColor }]}
          value={desc}
          onChangeText={setDesc}
          placeholder="Enter artist name"
          placeholderTextColor="#777"
          autoCapitalize='words'
        />

        <Text style={[styles.label, { color: textColor }]}>
          Import Single Audio File
        </Text>
        <TouchableOpacity
          style={[
            styles.input,
            { justifyContent: 'center', borderColor: textColor },
          ]}
          onPress={pickAudio}
        >
          <Text style={{ color: audioUri ? '#4CAF50' : '#777' }}>
            {audioUri ? '✓ Audio Selected' : 'Tap to Select MP3'}
          </Text>
        </TouchableOpacity>

        {/* --- MULTIPLE FILES SECTION --- */}
        <Text style={[styles.label, { color: '#6c57bf' }]}>
          Import Multiple Audio Files
        </Text>
        <TouchableOpacity
          style={[
            styles.input,
            { justifyContent: 'center', borderColor: '#7163a7af' },
          ]}
          onPress={pickMultipleAudio}
        >
          {/* LOGIC: Show Green Text and Count if files are selected */}
          <Text
            style={{
              color: multipleFiles.length > 0 ? '#4CAF50' : '#7163a7af',
            }}
          >
            {multipleFiles.length > 0
              ? `✓ ${multipleFiles.length} Songs Selected`
              : 'Import Folder / Multiple MP3s'}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, marginTop: 6, color: '#777' }}>
          As you Imports Multiple songs, you are able to set a cover, edit info,
          or delete from home screen.
        </Text>

        <Text style={[styles.label, { color: textColor }, { marginTop: 20 }]}>
          Add to Playlist (Optional)
        </Text>
        <View style={styles.collectionSection}>
          {collections.map(col => (
            <TouchableOpacity
              key={col.name}
              style={[
                styles.chip,
                selectedCol === col.name && styles.chipActive,
              ]}
              onPress={() =>
                setSelectedCol(selectedCol === col.name ? null : col.name)
              }
            >
              <Text
                style={[
                  styles.chipText,
                  { color: PlayListCol },
                  selectedCol === col.name && { color: 'white' },
                ]}
              >
                {col.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ---------------------- BOTTOM MUSIC CARD ---------------------- */}  
      <MusicCard />
    </SafeAreaView>
  );
};

export default ImportSong;

// ------------- UI STYLES --------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 42,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageBox: {
    width: 240,
    height: 240,
    borderWidth: 1,
    borderRadius: 30,
    overflow: 'hidden',
    marginVertical: 20,
    alignSelf: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    marginHorizontal: 'auto',
    justifyContent: 'center',
  },
  fullImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  grayText: {
    fontSize: 12,
    marginTop: 10,
    color: '#777',
  },
  label: {
    fontSize: 13,
    marginTop: 15,
    marginBottom: 5,
    fontWeight: '500',
  },

  input: {
    height: 46,
    fontSize: 16,
    borderWidth: 1,
    paddingLeft: 12,
    borderRadius: 8,
  },
  collectionSection: {
    paddingBottom: 100,
    marginTop: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    marginRight: 10,
    borderRadius: 10,
    marginBottom: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderColor: '#616161',
    justifyContent: 'space-between',
  },
  chipActive: {
    backgroundColor: '#414141ff',
    borderColor: '#414141ff',
  },
  chipText: {
    color: '#222',
    fontWeight: '500',
  },
});
