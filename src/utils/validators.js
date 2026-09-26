// src/utils/validators.js

export const isValidEmail = email => {
  if (!email) return false;
  const trimmed = String(email).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

export const normalizeEmail = email => String(email || '').trim().toLowerCase();

export const isStrongPassword = password => {
  if (!password) return false;
  const value = String(password);

  // min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value);
};

export const isValidName = name => {
  if (!name) return false;
  const trimmed = String(name).trim();
  return trimmed.length >= 2 && trimmed.length <= 60;
};

export const isValidGender = gender =>
  gender === 'male' || gender === 'female' || gender === 'other';

export const passwordsMatch = (password, confirmPassword) =>
  String(password || '') === String(confirmPassword || '');