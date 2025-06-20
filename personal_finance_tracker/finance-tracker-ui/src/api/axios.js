// src/api/axios.js

import axios from "axios";

// Use environment variable or fallback to localhost
const api = axios.create({
  baseURL: process.env.REACT_APP_API || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // use only if needed
});

// Attach JWT to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
