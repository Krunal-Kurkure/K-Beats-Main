import { open } from 'react-native-quick-sqlite';
import RNFS from 'react-native-fs';

// --------------------------- OPENS DATABASE FOR APP -------------------------------------------
const db = open({ name: 'kkmusic.sqlite' });

// New AI folders ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26
export const APP_AI_DIR = `${RNFS.DocumentDirectoryPath}/ai_jobs`;
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26

// APP audio directory (where trimmed files will be stored permanently)
export const APP_AUDIO_DIR = `${RNFS.DocumentDirectoryPath}/songs`;

// --------------------------- ENSURE AUDIO DIRECTORY EXIST OR NOT ------------------------------
export const ensureAudioDir = async () => {
  try {
    const exists = await RNFS.exists(APP_AUDIO_DIR);
    if (!exists) {
      await RNFS.mkdir(APP_AUDIO_DIR);
    }
  } catch (e) {
    console.warn('ensureAudioDir error', e);
  }
};

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26
export const ensureAiDir = async () => {
  try {
    const exists = await RNFS.exists(APP_AI_DIR);
    if (!exists) {
      await RNFS.mkdir(APP_AI_DIR);
    }
  } catch (e) {
    console.warn('ensureAiDir error', e);
  }
};

export const createAiJobWorkspace = async jobId => {
  const root = `${APP_AI_DIR}/${jobId}`;
  const inputDir = `${root}/input`;
  const outputDir = `${root}/output`;
  const logsDir = `${root}/logs`;
  const metadataDir = `${root}/metadata`;
  const stemsDir = `${root}/stems`;

  for (const dir of [root, inputDir, outputDir, logsDir, metadataDir, stemsDir]) {
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
  }

  return {
    root,
    inputDir,
    outputDir,
    logsDir,
    metadataDir,
    stemsDir,
    logPath: `${logsDir}/process.log`,
    metadataPath: `${metadataDir}/job.json`,
    zipPath: `${outputDir}/stems.zip`,
  };
};

export const removeFolderIfExists = async folderPath => {
  try {
    const exists = await RNFS.exists(folderPath);
    if (exists) {
      await RNFS.unlink(folderPath);
    }
  } catch (e) {
    console.warn('removeFolderIfExists error', e);
  }
};
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26

// helper to parse result rows
const parseResult = result => {
  if (!result || !result.rows) return [];
  // some wrappers expose rows._array
  if (result.rows._array) return result.rows._array;
  const items = [];
  for (let i = 0; i < result.rows.length; i++) {
    items.push(result.rows.item(i));
  }
  return items;
};

//------------------------- ENSURES THE SONG LYRICS COLUMN EXIST IF NOT ADD IT ---------------------
const ensureSongColumns = () => {
  try {
    const infoRes = db.execute(`PRAGMA table_info(songs);`);
    const cols = parseResult(infoRes).map(col => col.name);

    if (!cols.includes('lyrics')) {
      db.execute(`ALTER TABLE songs ADD COLUMN lyrics TEXT DEFAULT '';`);
    }
  } catch (e) {
    console.warn('ensureSongColumns error:', e);
  }
};

//------------------------- ENSURES THE ARTIST BIO, DOB, GENRES FIELDS EXISTS ----------------------
const ensureArtistCollectionColumns = () => {
  try {
    const infoRes = db.execute(`PRAGMA table_info(artist_collections);`);
    const cols = parseResult(infoRes).map(col => col.name);

    if (!cols.includes('bio')) {
      db.execute(
        `ALTER TABLE artist_collections ADD COLUMN bio TEXT DEFAULT '';`,
      );
    }

    if (!cols.includes('dob')) {
      db.execute(
        `ALTER TABLE artist_collections ADD COLUMN dob TEXT DEFAULT '';`,
      );
    }

    if (!cols.includes('genres')) {
      db.execute(
        `ALTER TABLE artist_collections ADD COLUMN genres TEXT DEFAULT '';`,
      );
    }
  } catch (e) {
    console.warn('ensureArtistCollectionColumns error:', e);
  }
};

//------------------------- INITIATING THE DATABASE TABLES ------------------------------------------
export const initDB = () => {
  try {
    // songs - keep your existing columns
    db.execute(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        url TEXT,
        title TEXT,
        artist TEXT,
        artwork TEXT,
        description TEXT,
        collection TEXT,
        duration REAL
      );
    `);

    // legacy collections table (name only)
    db.execute(`
      CREATE TABLE IF NOT EXISTS collections (
        name TEXT PRIMARY KEY
      );
    `);

    db.execute(`
      CREATE TABLE IF NOT EXISTS artist_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        artwork TEXT,
        bio TEXT DEFAULT '',
        dob TEXT DEFAULT '',
        genres TEXT DEFAULT ''
      );
    `);

    // mapping table for artist collection songs (copy-by-reference)
    db.execute(`
      CREATE TABLE IF NOT EXISTS artist_collection_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artistCollectionId INTEGER,
        songId TEXT
      );
    `);

    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26

    db.execute(`
      CREATE TABLE IF NOT EXISTS ai_jobs (
        job_id TEXT PRIMARY KEY,
        song_id TEXT,
        song_title TEXT,
        song_artist TEXT,
        artwork TEXT,
        original_path TEXT,
        backend_job_id TEXT,
        status TEXT DEFAULT 'queued',
        processing_status TEXT DEFAULT 'queued',
        model_name TEXT DEFAULT 'htdemucs',
        credits_spent INTEGER DEFAULT 1,
        local_job_dir TEXT,
        local_zip_path TEXT,
        created_at TEXT DEFAULT '',
        started_at TEXT DEFAULT '',
        finished_at TEXT DEFAULT '',
        deleted INTEGER DEFAULT 0
      );
    `);

    db.execute(`
      CREATE TABLE IF NOT EXISTS ai_stems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT,
        stem_name TEXT,
        remote_url TEXT DEFAULT '',
        local_path TEXT,
        volume REAL DEFAULT 1,
        duration REAL DEFAULT 0,
        created_at TEXT DEFAULT ''
      );
    `);

    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26

    ensureArtistCollectionColumns(); // <--- ARTIST BIO, DOB, GENRES ADDED
    ensureSongColumns(); // <--- LYRICS COLUMN EXISTS

    console.log('SQLite Database Initialized (storage.js)');
  } catch (e) {
    console.error('Failed to init DB', e);
  }
};

// run on import
initDB();

//------------------- SAVE THE SONG INTO DATABSE -------------------------------------------------
export const saveSong = async newSong => {
  try {
    db.execute(
      `INSERT INTO songs (id, url, title, artist, artwork, description, collection, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         url=excluded.url, 
         title=excluded.title, 
         artist=excluded.artist, 
         artwork=excluded.artwork, 
         description=excluded.description, 
         collection=excluded.collection, 
         duration=excluded.duration;`,
      [
        newSong.id,
        newSong.url,
        newSong.title,
        newSong.artist,
        newSong.artwork,
        newSong.description,
        newSong.collection,
        newSong.duration || 0,
      ],
    );
    return getSongs();
  } catch (e) {
    console.error('Error saving song:', e);
    return [];
  }
};

// ---------------------------- GET THE SONGS FROM THE DATABASE -----------------------------------------
export const getSongs = async () => {
  try {
    const results = db.execute('SELECT * FROM songs');
    return parseResult(results);
  } catch (e) {
    console.error('Error getting songs:', e);
    return [];
  }
};

// ------------------------------ DELETE THE WHOLE SONG FROM DATABASE -----------------------------------
export const deleteSong = async songId => {
  try {
    // get details
    const results = db.execute('SELECT * FROM songs WHERE id = ?', [songId]);
    const rows = parseResult(results);
    if (rows.length > 0) {
      const song = rows[0];

      // remove audio file (if local)
      if (song.url && song.url.startsWith('file://')) {
        const audioPath = song.url.replace('file://', '');
        try {
          if (await RNFS.exists(audioPath)) {
            await RNFS.unlink(audioPath);
            console.log('Deleted audio:', audioPath);
          }
        } catch (err) {
          console.warn('Could not delete audio file', err);
        }
      }

      // remove artwork file (if local)
      if (song.artwork && song.artwork.startsWith('file://')) {
        const imagePath = song.artwork.replace('file://', '');
        try {
          if (await RNFS.exists(imagePath)) {
            await RNFS.unlink(imagePath);
            console.log('Deleted artwork:', imagePath);
          }
        } catch (err) {
          console.warn('Could not delete artwork', err);
        }
      }
    }

    db.execute('DELETE FROM songs WHERE id = ?', [songId]);
    // Also remove any mapping entries in artist_collection_songs referencing this song
    db.execute('DELETE FROM artist_collection_songs WHERE songId = ?', [
      songId,
    ]);

    return getSongs();
  } catch (e) {
    console.error('Error deleting song:', e);
    return [];
  }
};

 // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26
const getRows = result => {
  if (!result || !result.rows) return [];
  if (result.rows._array) return result.rows._array;

  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

const nowIso = () => new Date().toISOString();

// ------------------------- AI JOB HELPERS ---------------------------------
export const saveAiJob = async job => {
  try {
    const payload = {
      job_id: job.job_id,
      song_id: job.song_id || '',
      song_title: job.song_title || '',
      song_artist: job.song_artist || '',
      artwork: job.artwork || '',
      original_path: job.original_path || '',
      backend_job_id: job.backend_job_id || '',
      status: job.status || 'queued',
      processing_status: job.processing_status || 'queued',
      model_name: job.model_name || 'htdemucs',
      credits_spent: typeof job.credits_spent === 'number' ? job.credits_spent : 1,
      local_job_dir: job.local_job_dir || '',
      local_zip_path: job.local_zip_path || '',
      created_at: job.created_at || nowIso(),
      started_at: job.started_at || '',
      finished_at: job.finished_at || '',
      deleted: job.deleted ? 1 : 0,
    };

    db.execute(
      `
        INSERT OR REPLACE INTO ai_jobs (
          job_id, song_id, song_title, song_artist, artwork, original_path,
          backend_job_id, status, processing_status, model_name,
          credits_spent, local_job_dir, local_zip_path,
          created_at, started_at, finished_at, deleted
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.job_id,
        payload.song_id,
        payload.song_title,
        payload.song_artist,
        payload.artwork,
        payload.original_path,
        payload.backend_job_id,
        payload.status,
        payload.processing_status,
        payload.model_name,
        payload.credits_spent,
        payload.local_job_dir,
        payload.local_zip_path,
        payload.created_at,
        payload.started_at,
        payload.finished_at,
        payload.deleted,
      ],
    );

    return getAiJobById(payload.job_id);
  } catch (e) {
    console.error('saveAiJob error:', e);
    return null;
  }
};

export const updateAiJob = async (jobId, fields = {}) => {
  try {
    const keys = Object.keys(fields);
    if (!keys.length) return getAiJobById(jobId);

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => fields[key]);
    values.push(jobId);

    db.execute(`UPDATE ai_jobs SET ${setClause} WHERE job_id = ?`, values);
    return getAiJobById(jobId);
  } catch (e) {
    console.error('updateAiJob error:', e);
    return null;
  }
};

export const getAiJobById = async jobId => {
  try {
    const res = db.execute('SELECT * FROM ai_jobs WHERE job_id = ? LIMIT 1', [jobId]);
    const rows = getRows(res);
    return rows[0] || null;
  } catch (e) {
    console.error('getAiJobById error:', e);
    return null;
  }
};

export const getAiJobs = async () => {
  try {
    const res = db.execute(
      'SELECT * FROM ai_jobs WHERE deleted = 0 ORDER BY created_at DESC',
    );
    return getRows(res);
  } catch (e) {
    console.error('getAiJobs error:', e);
    return [];
  }
};

export const deleteAiJob = async jobId => {
  try {
    const job = await getAiJobById(jobId);

    db.execute('DELETE FROM ai_stems WHERE job_id = ?', [jobId]);
    db.execute('DELETE FROM ai_jobs WHERE job_id = ?', [jobId]);

    if (job?.local_job_dir) {
      await removeFolderIfExists(job.local_job_dir);
    } else {
      await removeFolderIfExists(`${APP_AI_DIR}/${jobId}`);
    }

    return true;
  } catch (e) {
    console.error('deleteAiJob error:', e);
    return false;
  }
};

export const saveAiStem = async stem => {
  try {
    db.execute(
      `
        INSERT INTO ai_stems (
          job_id, stem_name, remote_url, local_path, volume, duration, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        stem.job_id,
        stem.stem_name,
        stem.remote_url || '',
        stem.local_path || '',
        typeof stem.volume === 'number' ? stem.volume : 1,
        typeof stem.duration === 'number' ? stem.duration : 0,
        stem.created_at || nowIso(),
      ],
    );
  } catch (e) {
    console.error('saveAiStem error:', e);
  }
};

export const getAiStemsByJobId = async jobId => {
  try {
    const res = db.execute(
      'SELECT * FROM ai_stems WHERE job_id = ? ORDER BY stem_name ASC',
      [jobId],
    );
    return getRows(res);
  } catch (e) {
    console.error('getAiStemsByJobId error:', e);
    return [];
  }
};

export const getAiJobBundle = async jobId => {
  try {
    const job = await getAiJobById(jobId);
    const stems = await getAiStemsByJobId(jobId);
    return {
      ...job,
      stems,
    };
  } catch (e) {
    console.error('getAiJobBundle error:', e);
    return null;
  }
};


export const getAiJobBySongId = async songId => {
  try {
    const res = db.execute(
      'SELECT * FROM ai_jobs WHERE song_id = ? LIMIT 1',
      [songId],
    );

    const rows = getRows(res);
    return rows[0] || null;
  } catch (e) {
    console.error('getAiJobBySongId error:', e);
    return null;
  }
};
 // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 8/06/26

// -------------------------------------- NORMAL COLLECTIONS (name-only) -------------------------
export const saveCollection = async name => {
  try {
    db.execute('INSERT OR IGNORE INTO collections (name) VALUES (?)', [name]);
    return getCollections();
  } catch (e) {
    console.error('Error saving collection:', e);
    return [];
  }
};

// ------------------------------ GET THE NORMAL COLLECTION FROM DATABASE --------------------------
export const getCollections = async () => {
  try {
    const results = db.execute('SELECT * FROM collections');
    return parseResult(results);
  } catch (e) {
    console.error('Error getCollections', e);
    return [];
  }
};

// ------------------------------ DELETE THE NORMAL COLLECTION FROM DATABASE --------------------------
export const deleteCollection = async (name, removeSongs = false) => {
  try {
    db.execute('DELETE FROM collections WHERE name = ?', [name]);
    if (removeSongs) {
      const songsInCol = db.execute(
        'SELECT id FROM songs WHERE collection = ?',
        [name],
      );
      const list = parseResult(songsInCol);
      for (const s of list) {
        await deleteSong(s.id);
      }
    } else {
      db.execute('UPDATE songs SET collection = NULL WHERE collection = ?', [
        name,
      ]);
    }
    return getCollections();
  } catch (e) {
    console.error('Error deleteCollection', e);
    return [];
  }
};

/**
 * Create an artist collection (name + artwork URI). Returns the created row (if you want).
 */
// ------------------------------------------- ARTIST COLLECTIONS (NEW) ----------------------------------
export const createArtistCollection = async (name, artwork = null) => {
  try {
    db.execute(
      'INSERT INTO artist_collections (name, artwork, bio, dob, genres) VALUES (?, ?, ?, ?, ?)',
      [name, artwork, '', '', ''],
    );
    // return last inserted row (best-effort)
    const res = db.execute(
      'SELECT * FROM artist_collections ORDER BY id DESC LIMIT 1',
    );
    const rows = parseResult(res);
    return rows[0] || null;
  } catch (e) {
    console.error('Error createArtistCollection', e);
    return null;
  }
};

// ------------------------------ GET THE ARTIST COLLECTION FROM DATABASE --------------------------
export const getArtistCollections = async () => {
  try {
    const res = db.execute('SELECT * FROM artist_collections ORDER BY id DESC');
    return parseResult(res);
  } catch (e) {
    console.error('Error getArtistCollections', e);
    return [];
  }
};

// ------------------------------ DELETE THE ARTIST COLLECTION FROM DATABASE --------------------------
export const deleteArtistCollection = async artistCollectionId => {
  try {
    // 1) Get the artist row so we can remove the artwork file if it is local
    const rowRes = db.execute('SELECT * FROM artist_collections WHERE id = ?', [
      artistCollectionId,
    ]);
    const rows = parseResult(rowRes);
    if (rows && rows.length > 0) {
      const artist = rows[0];
      if (artist.artwork) {
        try {
          // If stored as file://... remove prefix for RNFS
          const path = artist.artwork.startsWith('file://')
            ? artist.artwork.replace('file://', '')
            : artist.artwork;
          // Only attempt to delete if it's stored inside app doc folder (safety)
          if (path && path.includes(RNFS.DocumentDirectoryPath)) {
            const exists = await RNFS.exists(path);
            if (exists) {
              await RNFS.unlink(path);
              console.log('Deleted artist artwork file:', path);
            }
          } else {
            // If artwork is remote or not in app dir we skip deletion (safe)
            // console.log('Artwork not in app folder, skipping file delete.');
          }
        } catch (e) {
          console.warn('Failed to delete artist artwork file:', e);
        }
      }
    }

    // 2) remove mappings for songs
    db.execute(
      'DELETE FROM artist_collection_songs WHERE artistCollectionId = ?',
      [artistCollectionId],
    );

    // 3) remove the artist record
    db.execute('DELETE FROM artist_collections WHERE id = ?', [
      artistCollectionId,
    ]);

    return getArtistCollections();
  } catch (e) {
    console.error('Error deleteArtistCollection', e);
    return [];
  }
};

// ---------------- ARTIST COLLECTION ⇄ SONG MAPPING (COPYING FROM WHOLE APP SONGS) --------------------
export const addSongToArtistCollection = async (artistCollectionId, songId) => {
  try {
    // avoid duplicates
    const check = db.execute(
      'SELECT * FROM artist_collection_songs WHERE artistCollectionId = ? AND songId = ?',
      [artistCollectionId, songId],
    );
    const found = parseResult(check);
    if (found.length > 0) return;

    db.execute(
      `INSERT INTO artist_collection_songs (artistCollectionId, songId) VALUES (?, ?)`,
      [artistCollectionId, songId],
    );
  } catch (e) {
    console.error('Error addSongToArtistCollection', e);
  }
};

// ------------------------------ DELETE THE COPY SONGS FROM THE ARTIST COLLETION --------------------------
export const removeSongFromArtistCollection = async (
  artistCollectionId,
  songId,
) => {
  try {
    db.execute(
      `DELETE FROM artist_collection_songs WHERE artistCollectionId = ? AND songId = ?`,
      [artistCollectionId, songId],
    );
  } catch (e) {
    console.error('Error removeSongFromArtistCollection', e);
  }
};

// ------------------------------ ADD SONGS COMPLETLY INTO THE NORMAL COLLETION --------------------------
export const addSongsToCollection = async (collectionName, songIds) => {
  songIds.forEach(id => {
    db.execute('UPDATE songs SET collection = ? WHERE id = ?', [
      collectionName,
      id,
    ]);
  });
  return getSongs();
};

// ------------------------------ DELETE THE COMPLETLY SONGS FROM THE NORMAL COLLETION (SONG GOES AGAIN TO HOME SCREEN )--------------------------
export const removeSongFromCollection = async songId => {
  db.execute('UPDATE songs SET collection = NULL WHERE id = ?', [songId]);
  return getSongs();
};

// ------------------------------ UPDATE THE SONGS INFO (IMAGE, SONGS NAME, SONE ARTIST NAME) --------------------------
export const updateSongInfo = async (songId, payload) => {
  try {
    // Get existing row
    const res = db.execute('SELECT * FROM songs WHERE id = ?', [songId]);
    const rows = parseResult(res);
    if (!rows || rows.length === 0) {
      return null;
    }
    const old = rows[0];

    // Determine new values (fall back to old if not provided)
    const newTitle =
      payload.title !== undefined && payload.title !== null
        ? payload.title
        : old.title;
    const newDescription =
      payload.description !== undefined && payload.description !== null
        ? payload.description
        : old.description;
    const newArtwork =
      payload.artwork !== undefined ? payload.artwork : old.artwork;

    // If artwork has changed, and old artwork is a local file in our DocumentDirectoryPath - remove it
    try {
      if (
        old.artwork &&
        old.artwork !== newArtwork &&
        old.artwork.startsWith('file://')
      ) {
        const oldPath = old.artwork.replace('file://', '');
        if (oldPath && oldPath.includes(RNFS.DocumentDirectoryPath)) {
          const exists = await RNFS.exists(oldPath);
          if (exists) {
            await RNFS.unlink(oldPath);
            console.log('Deleted old artwork file:', oldPath);
          }
        }
      }
    } catch (e) {
      // ignore deletion errors, but log
      console.warn('Failed to delete old artwork during updateSongInfo:', e);
    }

    // Update DB row (only metadata)
    db.execute(
      `UPDATE songs SET title = ?, description = ?, artwork = ? WHERE id = ?`,
      [newTitle, newDescription, newArtwork, songId],
    );

    // Return the updated row
    const updated = db.execute('SELECT * FROM songs WHERE id = ?', [songId]);
    const updatedRows = parseResult(updated);
    return updatedRows[0] || null;
  } catch (e) {
    console.error('Error updateSongInfo:', e);
    return null;
  }
};

// ----- Replace existing getArtistCollectionSongs with this (orders by mapping id insertion order) -----
export const getArtistCollectionSongs = async artistCollectionId => {
  try {
    const res = db.execute(
      `SELECT songs.* FROM songs
       INNER JOIN artist_collection_songs
       ON songs.id = artist_collection_songs.songId
       WHERE artist_collection_songs.artistCollectionId = ?
       ORDER BY artist_collection_songs.id ASC`, // ensure insertion order
      [artistCollectionId],
    );
    return parseResult(res);
  } catch (e) {
    console.error('Error getArtistCollectionSongs', e);
    return [];
  }
};

// ----- NEW: updateArtistCollection (change name and/or artwork) -----
// payload: { name, artwork } (artwork may be null or file:// or remote)
// When artwork changes: delete old artwork local file if stored inside app DocumentDirectory
export const updateArtistCollection = async (artistCollectionId, payload) => {
  try {
    const rowRes = db.execute('SELECT * FROM artist_collections WHERE id = ?', [
      artistCollectionId,
    ]);
    const rows = parseResult(rowRes);
    if (!rows || rows.length === 0) return null;

    const old = rows[0];

    const newName =
      payload.name !== undefined && payload.name !== null
        ? payload.name
        : old.name;

    const newArtwork =
      payload.artwork !== undefined ? payload.artwork : old.artwork;

    const newBio = payload.bio !== undefined ? payload.bio : old.bio || '';

    const newDob = payload.dob !== undefined ? payload.dob : old.dob || '';

    const newGenres =
      payload.genres !== undefined ? payload.genres : old.genres || '';

    try {
      if (
        old.artwork &&
        old.artwork !== newArtwork &&
        old.artwork.startsWith('file://')
      ) {
        const oldPath = old.artwork.replace('file://', '');
        if (oldPath && oldPath.includes(RNFS.DocumentDirectoryPath)) {
          const exists = await RNFS.exists(oldPath);
          if (exists) {
            await RNFS.unlink(oldPath);
            console.log('Deleted old artist artwork file:', oldPath);
          }
        }
      }
    } catch (e) {
      console.warn(
        'Failed to delete old artist artwork during updateArtistCollection:',
        e,
      );
    }

    db.execute(
      'UPDATE artist_collections SET name = ?, artwork = ?, bio = ?, dob = ?, genres = ? WHERE id = ?',
      [newName, newArtwork, newBio, newDob, newGenres, artistCollectionId],
    );

    const updatedRes = db.execute(
      'SELECT * FROM artist_collections WHERE id = ?',
      [artistCollectionId],
    );
    const updated = parseResult(updatedRes);
    return updated[0] || null;
  } catch (e) {
    console.error('Error updateArtistCollection', e);
    return null;
  }
};

// ----- NEW: updateArtistCollectionOrder(artistCollectionId, orderedSongIds) -----
// Rewrites mapping table entries so their insertion order matches 'orderedSongIds'.
// Implementation: delete existing mappings for this collection, then insert in requested order.
export const updateArtistCollectionOrder = async (
  artistCollectionId,
  orderedSongIds = [],
) => {
  try {
    // remove existing mappings for this collection
    db.execute(
      'DELETE FROM artist_collection_songs WHERE artistCollectionId = ?',
      [artistCollectionId],
    );

    // insert in requested order (this will create mapping rows with increasing id)
    for (const songId of orderedSongIds) {
      db.execute(
        'INSERT INTO artist_collection_songs (artistCollectionId, songId) VALUES (?, ?)',
        [artistCollectionId, songId],
      );
    }

    // Optionally preserve any songs that were previously part of collection but not included in orderedSongIds:
    // If you want the final list to include the remaining songs appended after the ordered ones (instead of removing them),
    // caller should pass orderedSongIds that includes the songs they want — here we strictly rewrite to exactly provided sequence.
    return getArtistCollectionSongs(artistCollectionId);
  } catch (e) {
    console.error('Error updateArtistCollectionOrder', e);
    return [];
  }
};

// ----- GET SINGLE ARTIST COLLECTION BY ID ----- 14/04/2026
export const getArtistCollectionById = async id => {
  try {
    const res = db.execute('SELECT * FROM artist_collections WHERE id = ?', [
      id,
    ]);
    const rows = parseResult(res);
    return rows[0] || null;
  } catch (e) {
    console.error('Error getArtistCollectionById', e);
    return null;
  }
};

// ------------------------------ LYRICS DATA UPDATES AND SAVED --------------------------
export const updateSongLyrics = async (songId, lrcText) => {
  try {
    db.execute('UPDATE songs SET lyrics = ? WHERE id = ?', [lrcText, songId]);
    console.log('Lyrics updated successfully for song:', songId);
    return true;
  } catch (e) {
    console.error('Error updateSongLyrics:', e);
    return false;
  }
};
