// src/services/authService.js

import {
  forgotPasswordApi,
  getMeApi,
  loginUserApi,
  logoutUserApi,
  refreshTokenApi,
  registerUserApi,
  resetPasswordApi,
} from '../api/authApi';

export const authService = {
  register: registerUserApi,
  login: loginUserApi,
  logout: logoutUserApi,
  me: getMeApi,
  refresh: refreshTokenApi,
  forgotPassword: forgotPasswordApi,
  resetPassword: resetPasswordApi,
};