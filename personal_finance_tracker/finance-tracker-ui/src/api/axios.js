// src/api/axios.js

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", // full URL
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // only if FastAPI allows credentials
});

// Attach JWT to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Make sure you use the same key when storing
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
