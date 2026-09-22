import { get, post } from './apiService';

// ==========================================
// TRACE / QR SERVICE
// ==========================================

const issueQr = async (entityType, entityId) =>
  post('/trace/qr/issue', { entityType, entityId });

const verifyQr = async ({ token, location = '', notes = '', syncId = null }) =>
  post('/trace/qr/verify', {
    token,
    location,
    notes,
    syncId,
  });

const getTimeline = async (entityType, entityId) =>
  get(`/trace/${entityType}/${entityId}`);

const getMyScans = async () => get('/trace/mine');

const syncOffline = async (checkpoints) =>
  post('/trace/offline-sync', { checkpoints });

export { issueQr, verifyQr, getTimeline, getMyScans, syncOffline };