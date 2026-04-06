/**
 * DataGuard PRO — Frontend API Service
 * Centralizes all HTTP requests to the Express backend (port 5000).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ─── Helper: Authenticated fetch ───────────────────────────────────

const getHeaders = (isJson = true) => {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = typeof window !== 'undefined' ? localStorage.getItem('dg_token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

// ─── Auth ──────────────────────────────────────────────────────────

export const signup = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
};

export const login = async (email, password) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
};

export const getMe = async () => {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
  return handleResponse(res);
};

// ─── Connections ───────────────────────────────────────────────────

export const getConnections = async () => {
  const res = await fetch(`${API_BASE}/api/connections`, { headers: getHeaders() });
  return handleResponse(res);
};

export const addConnection = async (config) => {
  const res = await fetch(`${API_BASE}/api/connections`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(config),
  });
  return handleResponse(res);
};

export const testNewConnection = async (config) => {
  const res = await fetch(`${API_BASE}/api/connections/test-new`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(config),
  });
  return handleResponse(res);
};

export const testConnection = async (connectionId) => {
  const res = await fetch(`${API_BASE}/api/connections/${connectionId}/test`, {
    method: 'POST', headers: getHeaders(),
  });
  return handleResponse(res);
};

export const deleteConnection = async (connectionId) => {
  const res = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  return handleResponse(res);
};

export const fetchSampleData = async (connectionId, query) => {
  const res = await fetch(`${API_BASE}/api/connections/${connectionId}/fetch-sample`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ query }),
  });
  return handleResponse(res);
};

// ─── Data Sources ──────────────────────────────────────────────────

export const getDataSources = async () => {
  const res = await fetch(`${API_BASE}/api/data-sources`, { headers: getHeaders() });
  return handleResponse(res);
};

export const getDataSource = async (id) => {
  const res = await fetch(`${API_BASE}/api/data-sources/${id}`, { headers: getHeaders() });
  return handleResponse(res);
};

export const createDataSource = async (config) => {
  const res = await fetch(`${API_BASE}/api/data-sources`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(config),
  });
  return handleResponse(res);
};

export const validateDataSource = async (sourceId) => {
  const res = await fetch(`${API_BASE}/api/data-sources/${sourceId}/validate`, {
    method: 'POST', headers: getHeaders(),
  });
  return handleResponse(res);
};

export const deleteDataSource = async (sourceId) => {
  const res = await fetch(`${API_BASE}/api/data-sources/${sourceId}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  return handleResponse(res);
};

// ─── Uploads ───────────────────────────────────────────────────────

export const uploadCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('dg_token')}` },
    body: formData,
  });
  return handleResponse(res);
};

export const getUploads = async () => {
  const res = await fetch(`${API_BASE}/api/uploads`, { headers: getHeaders() });
  return handleResponse(res);
};

export const getUpload = async (id) => {
  const res = await fetch(`${API_BASE}/api/upload/${id}`, { headers: getHeaders() });
  return handleResponse(res);
};

// ─── Claude AI Analysis ───────────────────────────────────────────

export const analyzeProblems = async (uploadId, includeAI = true) => {
  const res = await fetch(`${API_BASE}/api/analyze/problems`, {
    method: 'POST', headers: getHeaders(),
    body: JSON.stringify({ uploadId, includeAI }),
  });
  return handleResponse(res);
};

// ─── Monitoring ────────────────────────────────────────────────────

export const startMonitoring = async (sourceId, schedule = 'daily') => {
  const res = await fetch(`${API_BASE}/api/monitoring/${sourceId}/start`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ schedule }),
  });
  return handleResponse(res);
};

export const stopMonitoring = async (sourceId) => {
  const res = await fetch(`${API_BASE}/api/monitoring/${sourceId}/stop`, {
    method: 'POST', headers: getHeaders(),
  });
  return handleResponse(res);
};

export const getMonitoringStatus = async (sourceId) => {
  const res = await fetch(`${API_BASE}/api/monitoring/${sourceId}/status`, { headers: getHeaders() });
  return handleResponse(res);
};

export const getMonitoringHistory = async (sourceId, days = 30) => {
  const res = await fetch(`${API_BASE}/api/monitoring/${sourceId}/history?days=${days}`, { headers: getHeaders() });
  return handleResponse(res);
};

export const checkNow = async (sourceId) => {
  const res = await fetch(`${API_BASE}/api/monitoring/${sourceId}/check-now`, {
    method: 'POST', headers: getHeaders(),
  });
  return handleResponse(res);
};

// ─── Alerts ────────────────────────────────────────────────────────

export const getAlerts = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/api/alerts?${params}`, { headers: getHeaders() });
  return handleResponse(res);
};

export const markAlertRead = async (alertId) => {
  const res = await fetch(`${API_BASE}/api/alerts/${alertId}/mark-read`, {
    method: 'POST', headers: getHeaders(),
  });
  return handleResponse(res);
};

export const markAllAlertsRead = async () => {
  const res = await fetch(`${API_BASE}/api/alerts/mark-all-read`, {
    method: 'POST', headers: getHeaders(),
  });
  return handleResponse(res);
};

export const deleteAlert = async (alertId) => {
  const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  return handleResponse(res);
};

// ─── Team ──────────────────────────────────────────────────────────

export const inviteTeamMember = async (sourceId, email, role = 'viewer') => {
  const res = await fetch(`${API_BASE}/api/team/${sourceId}/invite`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ email, role }),
  });
  return handleResponse(res);
};

export const getTeamMembers = async (sourceId) => {
  const res = await fetch(`${API_BASE}/api/team/${sourceId}/members`, { headers: getHeaders() });
  return handleResponse(res);
};

export const updateMemberRole = async (sourceId, memberId, role) => {
  const res = await fetch(`${API_BASE}/api/team/${sourceId}/member/${memberId}/role`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify({ role }),
  });
  return handleResponse(res);
};

export const removeTeamMember = async (sourceId, email) => {
  const res = await fetch(`${API_BASE}/api/team/${sourceId}/member/${email}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  return handleResponse(res);
};
