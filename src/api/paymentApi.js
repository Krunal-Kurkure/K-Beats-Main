// src/api/paymentApi.js

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

export const createPaymentOrderApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/payments/create-order`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJson(res);
};

export const verifyPaymentApi = async payload => {
  const res = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJson(res);
};

export const getPaymentHistoryApi = async () => {
  const res = await fetch(`${API_BASE_URL}/payments/history`, {
    method: 'GET',
    headers: await buildHeaders(),
  });

  return parseJson(res);
};