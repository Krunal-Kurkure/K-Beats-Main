import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@kbeats_access_token';
const REFRESH_TOKEN_KEY = '@kbeats_refresh_token';

export const saveTokens = async ({ accessToken, refreshToken }) => {
  if (accessToken) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const getAccessToken = async () => {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async () => {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

export const saveAccessToken = async token => {
  if (token) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

export const saveRefreshToken = async token => {
  if (token) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  }
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};