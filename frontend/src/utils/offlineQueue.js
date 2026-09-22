// ==========================================
// OFFLINE QR SYNC QUEUE
// Stores QR scans locally while offline and
// flushes them to the server on reconnect.
// ==========================================

const QUEUE_KEY = 'krishibandhu_scan_queue';

const getQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);

    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const enqueueScan = ({
  token,
  location = '',
  notes = '',
  entityType = '',
  entityId = '',
}) => {
  const queue = getQueue();

  const syncId =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const entry = {
    token,
    syncId,
    location,
    notes,
    entityType,
    entityId,
    queuedAt: new Date().toISOString(),
  };

  localStorage.setItem(
    QUEUE_KEY,
    JSON.stringify([...queue, entry]),
  );

  return syncId;
};

const getQueuedScans = () => getQueue();

const clearQueue = () => localStorage.removeItem(QUEUE_KEY);

const countQueued = () => getQueue().length;

export {
  enqueueScan,
  getQueuedScans,
  clearQueue,
  countQueued,
  QUEUE_KEY,
};