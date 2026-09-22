import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useLocation,
} from 'react-router-dom';

import {
  ExternalLink,
  Leaf,
  Loader2,
  Mic,
  Send,
  Square,
  X,
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './FloatingChatButton.css';

/*
 * Floating KrishiBandhu AI chat widget.
 *
 * - Appears on every logged-in page.
 * - Tap it (no drag) to open the chat right there.
 * - Drag it anywhere on screen; it stays where you
 *   leave it and remembers the position.
 * - "Open full chat" button opens the full AI page in
 *   a new tab.
 * - Voice: tap the mic to record, tap again to send
 *   the voice note for transcription.
 */

const STORAGE_KEY = 'kbFabPosition';

const FAB_SIZE = 54;

const EDGE_PAD = 12;

/* Default resting spot: lower-right, but lifted clearly
   above the very bottom edge so it stays visible and
   doesn't crowd the bottom nav. */
const DEFAULT_BOTTOM = 160;

const DEFAULT_RIGHT = 24;

const TAP_MAX_MOVE = 6;

const POPUP_HEIGHT = 470;

function readSavedPos() {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) return null;

    const parsed =
      JSON.parse(raw);

    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number'
    ) {
      return {
        x: parsed.x,
        y: parsed.y,
      };
    }
  } catch (error) {
    // ignore - fall back to default position
  }

  return null;
}

function clampPos(x, y) {
  const vw =
    window.innerWidth || 1200;

  const vh =
    window.innerHeight || 800;

  return {
    x: Math.min(
      Math.max(x, EDGE_PAD),
      vw - FAB_SIZE - EDGE_PAD,
    ),

    y: Math.min(
      Math.max(y, EDGE_PAD),
      vh - FAB_SIZE - EDGE_PAD,
    ),
  };
}

function nowTime() {
  return new Date().toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function FloatingChatButton() {
  const { t, lang } =
    useLanguage();

  const { pathname } =
    useLocation();

  const [pos, setPos] = useState(
    () => {
      const saved =
        readSavedPos();

      return saved
        ? clampPos(
            saved.x,
            saved.y,
          )
        : saved;
    },
  );

  const [dragging, setDragging] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const [chatMessages, setChatMessages] =
    useState([
      {
        role: 'assistant',
        content: t("Hello! I'm KrishiBandhu AI 🌾 Ask me anything about crops, farming, market prices, or agricultural practices."),
        time: nowTime(),
      },
    ]);

  const [chatInput, setChatInput] =
    useState('');

  const [chatLoading, setChatLoading] =
    useState(false);

  /* ----- chat history language sync ----- */

  const chatMessagesRef =
    useRef(chatMessages);

  const chatLanguageRef =
    useRef(lang);

  const [translatingHistory,
    setTranslatingHistory] =
    useState(false);

  /* ----- voice state ----- */

  const [isRecording, setIsRecording] =
    useState(false);

  const [isTranscribing, setIsTranscribing] =
    useState(false);

  const [recordingSeconds, setRecordingSeconds] =
    useState(0);

  const dragRef = useRef(null);

  const movedRef = useRef(false);

  const pressedRef = useRef(false);

  const latestPosRef =
    useRef(pos);

  const inputRef = useRef(null);

  const messagesListRef =
    useRef(null);

  const lastAssistantRef =
    useRef(null);

  const prevLoadingRef =
    useRef(false);

  const mediaStreamRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const recordingChunksRef =
    useRef([]);

  const recordingTimerRef =
    useRef(null);

  const discardRecordingRef =
    useRef(false);

  // On open: show the latest messages (bottom of the list).
  useEffect(() => {
    if (!open) return;

    const list =
      messagesListRef.current;

    if (list) {
      list.scrollTop =
        list.scrollHeight;
    }
  }, [open]);

  // While thinking: keep the newest content visible (bottom).
  // When the reply arrives: jump so the top of the NEW
  // response is what the user sees first - not the tail.
  useEffect(() => {
    if (!open) return;

    const list =
      messagesListRef.current;

    if (!list) return;

    if (chatLoading) {
      list.scrollTop =
        list.scrollHeight;
    } else if (
      prevLoadingRef.current
    ) {
      const replyEl =
        lastAssistantRef.current;

      if (replyEl) {
        const replyTop =
          replyEl.offsetTop -
          list.offsetTop;

        list.scrollTop = Math.max(
          0,
          replyTop - 6,
        );
      }
    }

    prevLoadingRef.current =
      chatLoading;
  }, [chatLoading, open]);

  // Focus the textarea the moment the popup opens.
  useEffect(() => {
    if (!open) return;

    inputRef.current?.focus();
  }, [open]);

  // Keep a fresh copy of the conversation for the
  // language-switch translator (avoids stale closures).
  useEffect(() => {
    chatMessagesRef.current =
      chatMessages;
  }, [chatMessages]);

  // When the app language switches (EN / मराठी / हिंदी),
  // translate the whole existing conversation so the
  // history follows the new language.
  useEffect(() => {
    const targetLang = lang;

    if (
      targetLang ===
      chatLanguageRef.current
    ) {
      return;
    }

    const messagesNow =
      chatMessagesRef.current;

    if (!messagesNow.length) {
      chatLanguageRef.current =
        targetLang;
      return;
    }

    let cancelled = false;

    setTranslatingHistory(true);

    (async () => {
      try {
        const response =
          await fetch(
            `${API_URL}/ai/translate`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization: `Bearer ${
                  localStorage.getItem(
                    'krishibandhu_token',
                  ) || ''
                }`,
              },

              body: JSON.stringify({
                messages:
                  messagesNow.map(
                    (item) => ({
                      role:
                        item.role,
                      content:
                        item.content,
                    }),
                  ),

                language:
                  targetLang,
              }),
            },
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success ||
          !Array.isArray(
            data.translations,
          )
        ) {
          throw new Error(
            data.message ||
              'translate failed',
          );
        }

        if (cancelled) return;

        setChatMessages(
          (previous) =>
            previous.map(
              (item, index) => ({
                ...item,

                content:
                  data.translations[
                    index
                  ] ??
                  item.content,
              }),
            ),
        );

        chatLanguageRef.current =
          targetLang;
      } catch (error) {
        console.error(
          'Chat history translation failed:',
          error,
        );

        // Keep the history as-is, but never get
        // stuck re-trying on every re-render.
        if (!cancelled) {
          chatLanguageRef.current =
            targetLang;
        }
      } finally {
        if (!cancelled) {
          setTranslatingHistory(
            false,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  // Stop any active recording when the popup closes.
  useEffect(() => {
    if (open) return;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        'inactive'
    ) {
      cancelVoiceRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clean everything up when the widget unmounts.
  useEffect(() => {
    return () => {
      clearRecordingTimer();

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          'inactive'
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          /* ignore */
        }
      }

      stopMediaTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- voice helpers ----- */

  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(
        recordingTimerRef.current,
      );

      recordingTimerRef.current =
        null;
    }
  };

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop(),
        );

      mediaStreamRef.current =
        null;
    }
  };

  const startVoiceRecording =
    async () => {
      if (
        isRecording ||
        isTranscribing ||
        chatLoading
      ) {
        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            },
          );

        mediaStreamRef.current =
          stream;

        const mimeType =
          MediaRecorder.isTypeSupported(
            'audio/webm;codecs=opus',
          )
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported(
                  'audio/webm',
                )
              ? 'audio/webm'
              : MediaRecorder.isTypeSupported(
                    'audio/mp4',
                  )
                ? 'audio/mp4'
                : '';

        const recorder =
          new MediaRecorder(
            stream,
            mimeType
              ? { mimeType }
              : undefined,
          );

        recordingChunksRef.current =
          [];

        recorder.ondataavailable = (
          event,
        ) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            recordingChunksRef.current.push(
              event.data,
            );
          }
        };

        recorder.onstop = () => {
          void handleRecordingStop();
        };

        recorder.start();

        mediaRecorderRef.current =
          recorder;

        discardRecordingRef.current =
          false;

        setIsRecording(true);
        setRecordingSeconds(0);

        recordingTimerRef.current =
          setInterval(() => {
            setRecordingSeconds(
              (seconds) =>
                seconds + 1,
            );
          }, 1000);
      } catch (error) {
        console.error(
          'Mic Access Error:',
          error,
        );

        const denied =
          error.name ===
            'NotAllowedError' ||
          error.name ===
            'PermissionDeniedError';

        alert(
          denied
            ? t('Microphone access was denied. Please allow microphone access in your browser and try again.')
            : t('Unable to access the microphone on this device.'),
        );
      }
    };

  const handleRecordingStop =
    async () => {
      clearRecordingTimer();

      setIsRecording(false);

      stopMediaTracks();

      mediaRecorderRef.current =
        null;

      const chunks =
        recordingChunksRef.current;

      recordingChunksRef.current =
        [];

      setRecordingSeconds(0);

      if (
        discardRecordingRef.current
      ) {
        discardRecordingRef.current =
          false;

        return;
      }

      if (!chunks.length) {
        return;
      }

      const mimeType =
        chunks[0].type ||
        'audio/webm';

      const blob = new Blob(
        chunks,
        { type: mimeType },
      );

      /*
        Extremely short recordings are almost
        always silence — drop them silently.
      */

      if (blob.size < 800) {
        return;
      }

      await transcribeBlob(
        blob,
        mimeType,
      );
    };

  const stopVoiceRecording = () => {
    discardRecordingRef.current =
      false;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    discardRecordingRef.current =
      true;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeBlob =
    async (blob, mimeType) => {
      try {
        setIsTranscribing(true);

        const formData =
          new FormData();

        const extension = mimeType.includes(
          'mp4',
        )
          ? 'm4a'
          : mimeType.includes('ogg')
            ? 'ogg'
            : 'webm';

        formData.append(
          'audio',
          new File(
            [blob],
            `voice-${Date.now()}.${extension}`,
            { type: mimeType },
          ),
        );

        formData.append(
          'language',
          lang,
        );

        const response =
          await fetch(
            `${API_URL}/ai/transcribe`,
            {
              method: 'POST',
              body: formData,
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            t(data.error) ||
              t(data.message) ||
              t('Unable to transcribe audio.'),
          );
        }

        const transcript =
          data?.transcript;

        if (
          transcript &&
          transcript.trim()
        ) {
          setChatInput(
            transcript.trim(),
          );

          inputRef.current?.focus();
        } else {
          alert(
            t("Sorry, I couldn't hear anything in that recording. Please try again."),
          );
        }
      } catch (error) {
        console.error(
          'Transcription Error:',
          error,
        );

        alert(
          t(error.message) ||
            t('Unable to transcribe the voice note.'),
        );
      } finally {
        setIsTranscribing(false);
      }
    };

  // Already on the chat page - no need for the button.
  if (pathname === '/ai-assistant') {
    return null;
  }

  /* ----- drag ----- */

  const handlePointerDown = (
    event,
  ) => {
    movedRef.current = false;

    pressedRef.current = true;

    const start =
      latestPosRef.current;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: start
        ? start.x
        : window.innerWidth -
          FAB_SIZE -
          DEFAULT_RIGHT,
      origY: start
        ? start.y
        : window.innerHeight -
          FAB_SIZE -
          DEFAULT_BOTTOM,
    };

    try {
      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    } catch (error) {
      // synthetic events may not have an active pointer
    }
  };

  const handlePointerMove = (
    event,
  ) => {
    const drag =
      dragRef.current;

    if (!drag) return;

    const dx =
      event.clientX -
      drag.startX;

    const dy =
      event.clientY -
      drag.startY;

    if (
      Math.abs(dx) < TAP_MAX_MOVE &&
      Math.abs(dy) < TAP_MAX_MOVE
    ) {
      return;
    }

    movedRef.current = true;

    const next = clampPos(
      drag.origX + dx,
      drag.origY + dy,
    );

    setPos(next);

    latestPosRef.current = next;

    setDragging(true);
  };

  const handlePointerUp = () => {
    const wasDrag =
      movedRef.current;

    // Only act on a release that followed a press on
    // this button - stray pointer events are ignored.
    const didPress =
      pressedRef.current;

    dragRef.current = null;

    movedRef.current = false;

    pressedRef.current = false;

    setDragging(false);

    if (latestPosRef.current) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            latestPosRef.current,
          ),
        );
      } catch (error) {
        // storage unavailable - keep in-memory only
      }
    }

    // A quick tap (no drag) opens the chat right here.
    // Dragging only moves the button - it never opens it.
    if (
      didPress &&
      !wasDrag
    ) {
      setOpen((current) => !current);
    }
  };

  /* ----- chat ----- */

  const openFullChat = () => {
    window.open(
      '/ai-assistant?chat=1',
      '_blank',
      'noopener,noreferrer',
    );
  };

  const sendChatMessage =
    async () => {
      const message =
        chatInput.trim();

      if (
        !message ||
        chatLoading
      ) {
        return;
      }

      const userMessage = {
        role: 'user',
        content: message,
        time: nowTime(),
      };

      setChatMessages(
        (previous) => [
          ...previous,
          userMessage,
        ],
      );

      setChatInput('');

      setChatLoading(true);

      try {
        const history =
          chatMessages.map(
            (item) => ({
              role:
                item.role,
              content:
                item.content,
            }),
          );

        const response =
          await fetch(
            `${API_URL}/ai/chat`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
                Authorization: `Bearer ${
                  localStorage.getItem(
                    'krishibandhu_token',
                  ) || ''
                }`,
              },

              body: JSON.stringify({
                message,
                history,
                language: lang,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            t(data.error) ||
              t(data.message) ||
              t('Unable to get AI response.'),
          );
        }

        setChatMessages(
          (previous) => [
            ...previous,
            {
              role:
                'assistant',
              content:
                t(data.message) ||
                t('I could not generate a response.'),
              time: nowTime(),
            },
          ],
        );
      } catch (error) {
        console.error(
          'Floating Chat Error:',
          error,
        );

        setChatMessages(
          (previous) => [
            ...previous,
            {
              role:
                'assistant',
              content:
                `${t("Sorry, I couldn't process that request.")}\n\n**Error:** ${error.message}`,
              time: nowTime(),
            },
          ],
        );
      } finally {
        setChatLoading(false);
      }
    };

  const handleChatKeyDown = (
    event,
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendChatMessage();
    }
  };

  const style =
    pos && !dragging ? (
      {
        left: pos.x,
        top: pos.y,
      }
    ) : dragging ? (
      {
        left:
          latestPosRef.current.x,
        top: latestPosRef.current.y,
      }
    ) : null;

  const widgetClassNames = [
    'floating-chat-widget',
    pos ? 'floating-chat-dragged' : '',
    dragging
      ? 'floating-chat-dragging'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const buttonTop =
    (pos
      ? pos.y
      : window.innerHeight -
        DEFAULT_BOTTOM -
        FAB_SIZE);

  const openAbove =
    buttonTop - 16 > POPUP_HEIGHT;

  return (
    <div
      className={widgetClassNames}
      style={style}
    >
      {open && (
        <div
          className={
            'floating-chat-popup' +
            (openAbove
              ? ''
              : ' floating-chat-popup-below')
          }
        >
          <div className="floating-chat-popup-header">
            {/* Same logo mark as the top KrishiBandhu navbar. */}
            <div className="floating-chat-popup-avatar">
              <Leaf
                size={18}
                strokeWidth={2.2}
              />
            </div>

            <div className="floating-chat-popup-title">
              <strong>
                {t('Ask KrishiBandhu AI')}
              </strong>

              <span>
                {translatingHistory
                  ? lang === 'mr'
                    ? 'चॅट भाषांतरित होत आहे…'
                    : lang === 'hi'
                      ? 'चैट अनुवाद हो रहा है…'
                      : 'Translating chat…'
                  : t('Smart farming platform')}
              </span>
            </div>

            <button
              type="button"
              className="floating-chat-popup-open"
              onClick={openFullChat}
              title={t('Open full chat')}
              aria-label={t('Open full chat')}
            >
              <ExternalLink
                size={15}
              />
            </button>

            <button
              type="button"
              className="floating-chat-popup-close"
              onClick={() =>
                setOpen(false)
              }
              title={t('Close')}
              aria-label={t('Close')}
            >
              <X size={16} />
            </button>
          </div>

          <div
            className="floating-chat-popup-messages"
            ref={messagesListRef}
          >
            {chatMessages.map(
              (item, index) => (
                <div
                  key={index}
                  className={
                    'floating-chat-msg ' +
                    item.role
                  }
                  ref={
                    index ===
                      chatMessages.length -
                        1 &&
                    item.role ===
                      'assistant'
                      ? lastAssistantRef
                      : null
                  }
                >
                  {item.role ===
                    'assistant' && (
                    <div className="floating-chat-msg-avatar">
                      <Leaf
                        size={11}
                        strokeWidth={2.4}
                      />
                    </div>
                  )}

                  <div className="floating-chat-msg-stack">
                    <div
                      className={
                        'floating-chat-msg-bubble' +
                        (item.role ===
                        'assistant'
                          ? ''
                          : ' floating-chat-msg-user')
                      }
                    >
                      {item.role ===
                      'assistant' ? (
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                        >
                          {item.content}
                        </ReactMarkdown>
                      ) : (
                        item.content
                      )}
                    </div>

                    {item.time && (
                      <span className="floating-chat-msg-time">
                        {item.time}
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}

            {chatLoading && (
              <div className="floating-chat-msg assistant">
                <div className="floating-chat-msg-avatar">
                  <Leaf
                    size={11}
                    strokeWidth={2.4}
                  />
                </div>

                <div className="floating-chat-msg-bubble floating-chat-msg-loading">
                  <Loader2
                    size={14}
                    className="spin"
                  />

                  {t('Thinking...')}
                </div>
              </div>
            )}

          </div>

          {(isRecording ||
            isTranscribing) && (
            <div
              className={
                'floating-chat-voice-status' +
                (isTranscribing
                  ? ' transcribing'
                  : '')
              }
            >
              {isTranscribing ? (
                <>
                  <Loader2
                    size={13}
                    className="spin"
                  />
                  {t('Transcribing your voice note...')}
                </>
              ) : (
                <>
                  <span className="floating-chat-voice-pulse" />
                  <span>
                    {t('Recording... {0}s', recordingSeconds)}
                  </span>
                  <button
                    type="button"
                    className="floating-chat-voice-cancel"
                    onClick={
                      cancelVoiceRecording
                    }
                  >
                    {t('Cancel')}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="floating-chat-popup-input">
            <button
              type="button"
              className={
                'floating-chat-mic' +
                (isRecording
                  ? ' recording'
                  : '')
              }
              onClick={
                isRecording
                  ? stopVoiceRecording
                  : startVoiceRecording
              }
              disabled={
                chatLoading ||
                isTranscribing
              }
              aria-label={
                isRecording
                  ? t('Stop recording')
                  : t('Record a voice message')
              }
              title={
                isRecording
                  ? t('Stop recording')
                  : t('Record a voice message')
              }
            >
              {isRecording ? (
                <Square
                  size={14}
                  fill="currentColor"
                />
              ) : (
                <Mic size={17} />
              )}
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={chatInput}
              onChange={(event) =>
                setChatInput(
                  event.target.value,
                )
              }
              onKeyDown={
                handleChatKeyDown
              }
              placeholder={t('Ask about crops, farming…')}
              disabled={chatLoading}
            />

            <button
              type="button"
              onClick={
                sendChatMessage
              }
              disabled={
                !chatInput.trim() ||
                chatLoading
              }
              aria-label={t('Send message')}
            >
              {chatLoading ? (
                <Loader2
                  size={17}
                  className="spin"
                />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="floating-chat-button"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
        onContextMenu={(event) =>
          event.preventDefault()
        }
        aria-label={t('Ask KrishiBandhu AI')}
        title={`${t('Ask KrishiBandhu AI')} (${t('Drag me anywhere')})`}
      >
        <span className="floating-chat-glow" />

        {/* Same logo mark as the top KrishiBandhu navbar. */}
        <div
          className="floating-chat-logo"
          aria-hidden="true"
        >
          <Leaf
            size={24}
            strokeWidth={2.2}
          />
        </div>
      </button>
    </div>
  );
}

export default FloatingChatButton;