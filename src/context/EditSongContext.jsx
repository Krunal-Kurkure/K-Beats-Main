import { createContext, useContext, useState } from 'react';
import { updateSongInfo } from '../storage/storage';

// ---------------- IMAGE/FILE PACKAGE -------------------------------------
import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';
import { usePlayer } from './PlayerContext';
// 1. Create the Context
const EditSongContext = createContext();

// 2. Create the Provider
export const EditSongProvider = ({ children }) => {
  const { refreshSongs, syncSongChange } = usePlayer();

  // ---------------- EDIT SONG INFO MODAL STATES -----------------------------
  const [isEditSelecting, setIsEditSelecting] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageUri, setEditImageUri] = useState(null);
  const [modalEditVisible, setEditModalVisible] = useState(false);
  // ---------------- OPENS THREE DOT MENU STATE ------------
  const [menuVisible, setMenuVisible] = useState(false);

  // ---------------- IMAGE STATES --------------------------------------------
  const [imageUri, setImageUri] = useState(null);

  // ---------------- RELATED FUNCTIONS ---------------------------------------
  // ---------------- IMAGE PICKER WE REUSE IT IN EDIT/CREATE MODAL --------------------------------------------------------------------------------------------------
  const pickImage = async (targetSetter = setImageUri) => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
      });
      if (!res.assets || res.assets.length === 0) return;
      const picked = res.assets[0];
      const uri = picked.uri;
      // try to copy into DocumentDirectoryPath for reliability
      try {
        const ext =
          (picked.fileName && picked.fileName.split('.').pop()) || 'jpg';
        const destPath = `${
          RNFS.DocumentDirectoryPath
        }/kk_artist_${Date.now()}.${ext}`;
        if (
          uri.startsWith('content://') ||
          uri.startsWith('file://') ||
          uri.startsWith('/')
        ) {
          try {
            const src = uri.startsWith('file://')
              ? uri.replace('file://', '')
              : uri;
            await RNFS.copyFile(src, destPath);
          } catch (copyErr) {
            try {
              await RNFS.copyFile(uri, destPath);
            } catch (copyErr2) {
              console.warn(
                'RNFS copy failed twice, using original uri',
                copyErr,
                copyErr2,
              );
              targetSetter(uri);
              return;
            }
          }
          targetSetter(`file://${destPath}`);
          return;
        } else {
          // remote url or other scheme
          targetSetter(uri);
        }
      } catch (err) {
        console.warn(
          'Failed to persist picked image, using original uri.',
          err,
        );
        targetSetter(uri);
      }
    } catch (err) {
      console.warn('image pick error', err);
    }
  };

  // ---------------- OPENS EDIT SONG INFO MODAL FOR EDIT SONGS INFO ---------------------------
  const enterEditSelectionMode = () => {
    setMenuVisible(false);
    setIsEditSelecting(true);
  };

  // ---------------- DISABLE HOME MENU INFO CARD FOR EDIT SONGS -------------------------------
  const cancelEditSelectionMode = () => setIsEditSelecting(false);

  // ---------------- ENABLE TO SELECT SONGS FOR EDIT SONG INFO TO USER ------------------------
  const selectSongForEdit = song => {
    setSelectedSong(song);
    setEditTitle(song.title || '');
    setEditDescription(song.description || '');
    setEditImageUri(song.artwork || null);
    setIsEditSelecting(false);
    setEditModalVisible(true);
  };

  // ---------------- SAVE EDIT SONGS INFO -----------------------------------------------------
  const saveEditedSong = async () => {
    if (!selectedSong) {
      setEditModalVisible(false);
      return;
    }

    const finalTitle =
      editTitle && editTitle.trim() ? editTitle.trim() : selectedSong.title;
    let finalArtwork = editImageUri || null;

    try {
      if (finalArtwork && !finalArtwork.includes(RNFS.DocumentDirectoryPath)) {
        if (
          finalArtwork.startsWith('content://') ||
          finalArtwork.startsWith('file://') ||
          finalArtwork.startsWith('/')
        ) {
          const ext = (finalArtwork.split('.').pop() || 'jpg').split('?')[0];
          const destPath = `${
            RNFS.DocumentDirectoryPath
          }/kk_song_img_${Date.now()}.${ext}`;
          try {
            const src = finalArtwork.startsWith('file://')
              ? finalArtwork.replace('file://', '')
              : finalArtwork;
            await RNFS.copyFile(src, destPath);
            finalArtwork = `file://${destPath}`;
          } catch (err) {
            console.warn(
              'Could not persist edited image; will save provided uri',
              err,
            );
          }
        }
      }
    } catch (e) {
      console.warn('Error while preparing edited artwork', e);
    }

    try {
      await updateSongInfo(selectedSong.id, {
        title: finalTitle,
        description: editDescription || null,
        artwork: finalArtwork,
      });

      await refreshSongs();

      if (typeof syncSongChange === 'function') {
        await syncSongChange('metadata', {
          ...selectedSong,
          title: finalTitle,
          description: editDescription || null,
          artwork: finalArtwork,
        });
      }

      setSelectedSong(null);
      setEditTitle('');
      setEditDescription('');
      setEditImageUri(null);
      setEditModalVisible(false);
    } catch (e) {
      console.warn('Failed updating song info:', e);
    }
  };

  // 3. Bundle everything up to share globally
  const contextValue = {
    //modal uses
    modalEditVisible,
    setEditModalVisible,
    setSelectedSong,
    saveEditedSong,
    pickImage,
    setEditImageUri,
    editImageUri,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,

    //screen uses
    cancelEditSelectionMode,
    selectSongForEdit,
    selectedSong,
    isEditSelecting,
    enterEditSelectionMode,
    menuVisible,
    setMenuVisible,
  };

  return (
    <EditSongContext.Provider value={contextValue}>
      {children}
    </EditSongContext.Provider>
  );
};

// 4. Create the custom hook for easy access in your screens
export const useEditSong = () => {
  return useContext(EditSongContext);
};
