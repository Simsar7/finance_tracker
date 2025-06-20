import api from "./axios";

export const getRepayments = (params = {}) => 
  api.get("/repayments", { params });

export const createRepayment = (data) => 
  api.post("/repayments", data);

export const getBorrowRepayments = (borrowId) => 
  api.get(`/borrows/${borrowId}/repayments`);

export const getLendRepayments = (lendId) => 
  api.get(`/lends/${lendId}/repayments`);

export const getRepaymentSummary = (transactionId, transactionType) =>
  api.get(`/${transactionType}s/${transactionId}/summary`);

export const repayBorrow = (borrowId, data) => 
  api.post(`/repayments/borrows/${borrowId}`, data);

export const receiveRepayment = (lendId, data) => 
  api.post(`/repayments/lends/${lendId}`, data);