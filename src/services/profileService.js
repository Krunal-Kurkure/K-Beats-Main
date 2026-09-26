// src/services/profileService.js

import { getProfileApi, updateProfileApi } from '../api/userApi';

export const profileService = {
  getProfile: getProfileApi,
  updateProfile: updateProfileApi,
};