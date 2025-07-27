import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://terraformcoder-ai-dev.up.railway.app';

export const register = async (data) => axios.post(`${API_URL}/api/auth/register`, data);
export const login = async (data) => axios.post(`${API_URL}/api/auth/login`, data);
export const generateCode = async (description, provider, token) =>
  axios.post(`${API_URL}/api/generate`, { description, provider }, {
    headers: { Authorization: `Bearer ${token}` }
  });