import RNFS from 'react-native-fs';

export const API_URL = 'http://10.0.2.2:8001';
// export const API_URL = 'http://10.96.79.148:8001';
export const uploadSongForSeparation = async ({
  uri,
  name,
  type = 'audio/mpeg',
  modelName = 'htdemucs',
  device = 'cuda',
  twoStems = null,
}) => {
  const formData = new FormData();
  formData.append('file', { uri, name, type });

  const query =
    `?model_name=${encodeURIComponent(modelName)}` +
    `&device=${encodeURIComponent(device)}` +
    (twoStems ? `&two_stems=${encodeURIComponent(twoStems)}` : '');

  const res = await fetch(`${API_URL}/v1/separations${query}`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

export const getSeparationJob = async jobId => {
  const res = await fetch(`${API_URL}/v1/separations/${jobId}`);
  if (!res.ok) throw new Error('Could not load job');
  return res.json();
};

export const getSeparationStems = async jobId => {
  const res = await fetch(`${API_URL}/v1/separations/${jobId}/stems`);
  if (!res.ok) throw new Error('Could not load stems');
  return res.json();
};

export const waitForJobCompletion = async (jobId, { intervalMs = 3000 } = {}) => {
  // simple polling
  while (true) {
    const job = await getSeparationJob(jobId);
    if (job?.status === 'done' || job?.status === 'failed') return job;
    await new Promise(r => setTimeout(r, intervalMs));
  }
};

export const downloadAndStoreStems = async ({ jobId, stemsMap, stemsDir }) => {
  await RNFS.mkdir(stemsDir);
  const saved = {};

  for (const stemName of Object.keys(stemsMap || {})) {
    const destination = `${stemsDir}/${stemName}.wav`;
    const url = `${API_URL}/v1/separations/${jobId}/stems/${stemName}`;

    const dl = RNFS.downloadFile({
      fromUrl: url,
      toFile: destination,
    });

    const result = await dl.promise;
    if (result.statusCode !== 200) {
      throw new Error(`Failed to download ${stemName}`);
    }

    saved[stemName] = destination;
  }

  return saved;
};

export const deleteBackendJob = async jobId => {
  const res = await fetch(`${API_URL}/v1/separations/${jobId}`, {
    method: 'DELETE',
  });
  return res.ok;
};