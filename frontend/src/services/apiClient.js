import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});