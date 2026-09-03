import axios from 'axios';
import { useSessionStore } from '../store/sessionStore';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://dataprep-backend.onrender.com',
  timeout: 60000, // 60s for LLM calls
});

client.interceptors.request.use((config) => {
  const uuid = useSessionStore.getState().sessionUUID;
  if (uuid) {
    config.headers['X-Session-UUID'] = uuid;
  }
  return config;
});

export default client;
