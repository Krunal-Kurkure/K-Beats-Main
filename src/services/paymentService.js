// src/services/paymentService.js

import {
  createPaymentOrderApi,
  getPaymentHistoryApi,
  verifyPaymentApi,
} from '../api/paymentApi';

export const paymentService = {
  createOrder: createPaymentOrderApi,
  verify: verifyPaymentApi,
  history: getPaymentHistoryApi,
};