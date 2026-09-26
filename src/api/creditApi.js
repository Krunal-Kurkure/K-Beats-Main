// src/api/creditApi.js

import { API_BASE_URL } from '../utils/apiConfig';
import { getAccessToken } from '../storage/tokenStorage';

const buildHeaders = async () => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

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

export const getCreditBalanceApi = async () => {
  const res = await fetch(`${API_BASE_URL}/credits/balance`, {
    method: 'GET',
    headers: await buildHeaders(),
  });

  return parseJson(res);
};

export const getCreditHistoryApi = async () => {
  const res = await fetch(`${API_BASE_URL}/credits/history`, {
    method: 'GET',
    headers: await buildHeaders(),
  });

  return parseJson(res);
};

export const consumeCreditApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/credits/consume`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJson(res);
};

export const reserveCreditApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/credits/reserve`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJson(res);
};

export const refundCreditApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/credits/refund`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJson(res);
};