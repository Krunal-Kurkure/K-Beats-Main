// src/api/userApi.js

import { API_BASE_URL } from '../utils/apiConfig';
import { getAccessToken } from '../storage/tokenStorage';

const buildHeaders = async (auth = true) => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseJson = async res => {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(
      data?.detail || data?.message || data?.error || 'Request failed',
    );
  }

  return data;
};

export const getProfileApi = async () => {
  const res = await fetch(`${API_BASE_URL}/me`, {
    method: 'GET',
    headers: await buildHeaders(true),
  });

  return parseJson(res);
};

export const updateProfileApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: await buildHeaders(true),
    body: JSON.stringify(payload),
  });

  return parseJson(res);
};

export const getUserCreditsApi = async () => {
  const res = await fetch(`${API_BASE_URL}/credits`, {
    method: 'GET',
    headers: await buildHeaders(true),
  });

  return parseJson(res);
};