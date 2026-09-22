import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Camera,
  CheckCircle2,
  ClipboardList,
  Loader2,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';

import { Html5Qrcode } from 'html5-qrcode';

import {
  issueQr,
  verifyQr,
  getTimeline,
} from '../services/traceService';

import {
  enqueueScan,
  getQueuedScans,
  clearQueue,
} from '../utils/offlineQueue';

import { useLanguage } from '../context/LanguageContext';

import './QrModal.css';

// ==========================================
// QR MODAL
// - Show a QR for an entity (issue)
// - Scan/verify any KrishiBandhu QR
// - Show trace timeline + chain integrity
// - Queues scans offline, flushes on sync
// ==========================================

const FORMAT_DATE = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function QrModal({
  open,
  onClose,
  entityType,
  entityId,
  title = 'QR Code',
  description = '',
}) {
  const { t } = useLanguage();

  const [mode, setMode] = useState('scan'); // 'show' | 'scan'
  const [qr, setQr] = useState(null);
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const [queuedCount, setQueuedCount] = useState(
    getQueuedScans().length,
  );

  const scannerRef = useRef(null);
  const readerIdRef = useRef(`qr-reader-${Date.now()}`);

  const canShow = Boolean(entityType && entityId);

  useEffect(() => {
    if (!open) return;

    setError('');
    setResult(null);
    setTimeline(null);
    setTokenInput('');

    if (canShow) {
      setMode('show');

      issueQr(entityType, entityId)
        .then((data) => setQr({ token: data.token, dataUrl: data.dataUrl }))
        .catch((err) => setError(err.message));
    } else {
      setMode('scan');
    }
  }, [open, entityType, entityId]);

  // Stop camera on close
  useEffect(() => {
    if (!open && scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => null)
        .finally(() => {
          scannerRef.current = null;
          setCamera(false);
        });
    }
  }, [open]);

  const startCamera = async () => {
    setError('');

    try {
      setCamera(true);

      const scanner = new Html5Qrcode(readerIdRef.current);

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          setTokenInput(decodedText);
          handleVerify(decodedText);
        },
      );
    } catch (err) {
      setCamera(false);
      setError(
        t('Camera unavailable. Paste the QR token below instead.'),
      );
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .catch(() => null)
        .then(() => {
          scannerRef.current = null;
          setCamera(false);
        });
    }
  };

  const handleVerify = async (tokenText = tokenInput) => {
    if (!tokenText.trim()) {
      setError(t('Please enter or scan a QR token.'));
      return;
    }

    setVerifying(true);
    setError('');
    setResult(null);

    try {
      const data = await verifyQr({
        token: tokenText.trim(),
      });

      setResult({
        verified: true,
        entitySummary: data.entitySummary,
        entityType: data.entityType,
        entityId: data.entityId,
      });

      const trace = await getTimeline(
        data.entityType,
        data.entityId,
      ).catch(() => null);

      setTimeline(trace);
    } catch (err) {
      // Offline? Queue the scan for later sync.
      if (!navigator.onLine) {
        enqueueScan({ token: tokenText.trim() });
        setQueuedCount(getQueuedScans().length);

        setError(
          t('You are offline — scan queued and will sync when you reconnect.'),
        );
      } else {
        setError(t(err.message));
      }
    } finally {
      setVerifying(false);
      stopCamera();
    }
  };

  const syncNow = async () => {
    const queue = getQueuedScans();

    if (!queue.length) return;

    setVerifying(true);
    setError('');

    try {
      // eslint-disable-next-line no-restricted-syntax
      for (const entry of queue.slice(0, 50)) {
        await verifyQr({
          token: entry.token,
          syncId: entry.syncId,
          location: entry.location,
          notes: entry.notes,
        });
      }

      clearQueue();
      setQueuedCount(0);
    } catch (err) {
      setError(t(err.message));
    } finally {
      setVerifying(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="qr-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="qr-modal">

        <div className="qr-modal-header">
          <div>
            <h2>{title || t('QR Code')}</h2>

            <p>
              {description ||
                t('Scan to verify authenticity and view the trace journey.')}
            </p>
          </div>

          <button
            type="button"
            className="qr-close-btn"
            onClick={onClose}
            aria-label={t('Close')}
          >
            <X size={20} />
          </button>
        </div>

        {canShow && (
          <div className="qr-mode-tabs">
            <button
              type="button"
              className={mode === 'show' ? 'active' : ''}
              onClick={() => setMode('show')}
            >
              <QrCode size={16} />
              {t('Show QR')}
            </button>

            <button
              type="button"
              className={mode === 'scan' ? 'active' : ''}
              onClick={() => setMode('scan')}
            >
              <Camera size={16} />
              {t('Scan / Verify')}
            </button>
          </div>
        )}

        {mode === 'show' && qr && (
          <div className="qr-display">

            <div className="qr-image-wrap">
              <img src={qr.dataUrl} alt={t('{0} QR', title || 'QR Code')} />
            </div>

            <p className="qr-token-text">
              {qr.token}
            </p>

            <div className="qr-display-actions">

              <button
                type="button"
                className="qr-copy-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(qr.token);
                }}
              >
                {t('Copy token')}
              </button>

              <button
                type="button"
                className="qr-verify-btn"
                onClick={() => handleVerify(qr.token)}
                disabled={verifying}
              >
                {verifying ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                {verifying
                  ? t('Verifying...')
                  : t('Verify this record')}
              </button>

            </div>

          </div>
        )}

        {mode === 'scan' && (
          <div className="qr-scan-area">

            {camera ? (
              <div
                id={readerIdRef.current}
                className="qr-camera-view"
              />
            ) : (
              <button
                type="button"
                className="qr-camera-btn"
                onClick={startCamera}
              >
                <Camera size={20} />
                {t('Open camera to scan')}
              </button>
            )}

            <label className="qr-token-label">
              {t('Or paste the QR token:')}
              <textarea
                rows={2}
                value={tokenInput}
                onChange={(event) =>
                  setTokenInput(event.target.value)
                }
                placeholder="kbq.v1...."
              />
            </label>

            <button
              type="button"
              className="qr-verify-btn"
              onClick={() => handleVerify()}
              disabled={verifying}
            >
              {verifying ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {verifying ? 'Verifying...' : t('Verify')}
            </button>

            {queuedCount > 0 && (
              <div className="qr-offline-note">
                <p>
                  {queuedCount > 1
                    ? t('{0} offline scans queued.', queuedCount)
                    : t('{0} offline scan queued.', queuedCount)}
                </p>

                <button
                  type="button"
                  onClick={syncNow}
                  disabled={verifying}
                >
                  {t('Sync now')}
                </button>
              </div>
            )}

          </div>
        )}

        {error && (
          <div className="qr-error">
            {error}
          </div>
        )}

        {result && (
          <div className="qr-result">

            <div className="qr-result-verified">
              <CheckCircle2 size={18} />
              {t('QR verified — this record is authentic.')}
            </div>

            <div className="qr-summary">
              <div className="qr-summary-grid">
                {Object.entries(
                  result.entitySummary || {},
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="qr-summary-item"
                  >
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {timeline && (
              <div className="qr-timeline">
                <div className="qr-timeline-header">
                  <ClipboardList size={16} />
                  {t('Trace journey')}

                  {timeline.chainValid === true && (
                    <span className="chain-badge ok">
                      <ShieldCheck size={13} />
                      {t('Chain intact')}
                    </span>
                  )}

                  {timeline.chainValid === false && (
                    <span className="chain-badge bad">
                      <ShieldAlert size={13} />
                      {t('Chain tampered')}
                    </span>
                  )}
                </div>

                {timeline.checkpoints.length === 0 ? (
                  <p className="qr-no-events">
                    {t('No scan events recorded yet for this record.')}
                  </p>
                ) : (
                  <div className="qr-event-list">
                    {timeline.checkpoints.map((checkpoint, index) => (
                      <div
                        className="qr-event"
                        key={`${checkpoint.createdAt}-${index}`}
                      >
                        <div className="qr-event-dot" />

                        <div>
                          <strong>
                            {t('{0} scan', checkpoint.qrType)}
                          </strong>

                          <p>
                            {t('by {0} · {1}', checkpoint.scannedByName || t('user'), FORMAT_DATE(checkpoint.createdAt))}
                          </p>

                          {checkpoint.location && (
                            <p>📍 {checkpoint.location}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {timeline.ledger?.blocks?.length > 0 && (
                  <div className="qr-ledger-note">
                    {timeline.ledger.blocks.length === 1
                      ? t('{0} hash-chained ledger block anchors this record.', timeline.ledger.blocks.length)
                      : t('{0} hash-chained ledger blocks anchor this record.', timeline.ledger.blocks.length)}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default QrModal;