// src/services/creditService.js

import {
  consumeCreditApi,
  getCreditBalanceApi,
  getCreditHistoryApi,
  refundCreditApi,
  reserveCreditApi,
} from '../api/creditApi';

export const creditService = {
  getBalance: getCreditBalanceApi,
  getHistory: getCreditHistoryApi,
  consume: consumeCreditApi,
  reserve: reserveCreditApi,
  refund: refundCreditApi,
};