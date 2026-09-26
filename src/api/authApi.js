import { API_BASE_URL } from '../utils/apiConfig';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '../storage/tokenStorage';

const buildHeaders = async (json = true, auth = true) => {
  const headers = {};

  if (json) headers.Accept = 'application/json';
  if (json) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async res => {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      data?.detail || data?.message || data?.error || 'Request failed';
    throw new Error(message);
  }

  return data;
};

export const registerUserApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: await buildHeaders(true, false),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  if (data?.access_token) {
    await saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
    });
  }

  return data;
};

export const loginUserApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: await buildHeaders(true, false),
    body: JSON.stringify(payload),
  });

  const data = await handleResponse(res);

  if (data?.access_token) {
    await saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || '',
    });
  }

  return data;
};

export const logoutUserApi = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: await buildHeaders(true, true),
    });

    await clearTokens();

    if (!res.ok) return null;
    return handleResponse(res);
  } catch (e) {
    await clearTokens();
    throw e;
  }
};

export const getMeApi = async () => {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: await buildHeaders(true, true),
  });

  return handleResponse(res);
};

export const forgotPasswordApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: await buildHeaders(true, false),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
};

export const resetPasswordApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: await buildHeaders(true, false),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
};

export const refreshTokenApi = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await handleResponse(res);

  if (data?.access_token) {
    await saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
    });
  }

  return data;
};