import api from "./axios";

export const getAllReports = () => api.get("/reports/");
export const generateReport = (type, data) => api.post(`/reports/generate/${type}`, data);
export const downloadReport = (id) => api.get(`/reports/download/${id}`, { responseType: 'blob' });
