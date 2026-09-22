import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useLocation } from 'react-router-dom';

import {
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ImagePlus,
  Leaf,
  Loader2,
  MapPin,
  Mic,
  Send,
  Sparkles,
  Sprout,
  Square,
  X,
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './AIAssistant.css';

const API_BASE_URL = API_URL;

/* =========================================================
   CONVERT QUINTAL PRICE TO KG PRICE
========================================================= */

const quintalToKg = (price) => {
  if (
    price === undefined ||
    price === null ||
    Number.isNaN(Number(price))
  ) {
    return 0;
  }

  return Number(price) / 100;
};

/* =========================================================
   FORMAT RUPEE
========================================================= */

const formatRupeesPerKg = (
  price,
) => {
  const kgPrice =
    quintalToKg(price);

  return kgPrice.toLocaleString(
    'en-IN',
    {
      minimumFractionDigits:
        kgPrice % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    },
  );
};

/* =========================================================
   MARKDOWN CONTENT
========================================================= */

function MarkdownContent({
  children,
}) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}

/* =========================================================
   PARSE AI ANALYSIS
========================================================= */

function parseAnalysis(
  analysis = '',
) {
  const getSection = (
    start,
    endPatterns = [],
  ) => {
    const endPattern =
      endPatterns.length > 0
        ? `(?=\\n(?:${endPatterns.join('|')}):)`
        : '$';

    const regex = new RegExp(
      `${start}:\\s*([\\s\\S]*?)${endPattern}`,
      'i',
    );

    const match =
      analysis.match(regex);

    return match
      ? match[1].trim()
      : '';
  };

  return {
    crop: getSection(
      'CROP',
      [
        'QUALITY SCORE',
        'OVERALL QUALITY',
      ],
    ),

    quality: getSection(
      'QUALITY SCORE',
      [
        'OVERALL QUALITY',
        'LEAF CONDITION',
      ],
    ),

    overallQuality:
      getSection(
        'OVERALL QUALITY',
        [
          'LEAF CONDITION',
          'FRUIT / PRODUCE CONDITION',
        ],
      ),

    leafCondition:
      getSection(
        'LEAF CONDITION',
        [
          'FRUIT / PRODUCE CONDITION',
          'VISIBLE CONCERNS',
        ],
      ),

    produceCondition:
      getSection(
        'FRUIT / PRODUCE CONDITION',
        [
          'VISIBLE CONCERNS',
          'POSSIBLE ISSUES',
        ],
      ),

    concerns:
      getSection(
        'VISIBLE CONCERNS',
        [
          'POSSIBLE ISSUES',
          'RECOMMENDATIONS',
        ],
      ),

    issues:
      getSection(
        'POSSIBLE ISSUES',
        [
          'RECOMMENDATIONS',
          'CONFIDENCE',
        ],
      ),

    recommendations:
      getSection(
        'RECOMMENDATIONS',
        [
          'CONFIDENCE',
          'NOTE',
        ],
      ),

    confidence:
      getSection(
        'CONFIDENCE',
        ['NOTE'],
      ),

    note:
      getSection(
        'NOTE',
        [],
      ),
  };
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function AIAssistant() {
  const { t, lang } = useLanguage();

  /* =======================================================
     CHAT STATE
  ======================================================= */

  const [
    chatMessages,
    setChatMessages,
  ] = useState([
    {
      role: 'assistant',
      content: t("Hello! I'm KrishiBandhu AI 🌾 Ask me anything about crops, farming, market prices, or agricultural practices."),
    },
  ]);

  const [
    chatInput,
    setChatInput,
  ] = useState('');

  const [
    chatLoading,
    setChatLoading,
  ] = useState(false);

  /* ----- chat history language sync ----- */

  const chatMessagesRef =
    useRef(chatMessages);

  const chatLanguageRef =
    useRef(lang);

  const [translatingHistory,
    setTranslatingHistory] =
    useState(false);

  /* =======================================================
     VOICE STATE
  ======================================================= */

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    isTranscribing,
    setIsTranscribing,
  ] = useState(false);

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0);

  /* =======================================================
     IMAGE STATE
  ======================================================= */

  const [
    selectedImage,
    setSelectedImage,
  ] = useState(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState('');

  const [
    imageMimeType,
    setImageMimeType,
  ] = useState('');

  const [
    imageLoading,
    setImageLoading,
  ] = useState(false);

  const [
    imageHint,
    setImageHint,
  ] = useState('');

  const [
    analysisResult,
    setAnalysisResult,
  ] = useState(null);

  /* =======================================================
     MARKET STATE
  ======================================================= */

  const [
    markets,
    setMarkets,
  ] = useState([]);

  const [
    selectedMarketId,
    setSelectedMarketId,
  ] = useState('');

  const [
    marketsLoading,
    setMarketsLoading,
  ] = useState(false);

  const [
    marketsError,
    setMarketsError,
  ] = useState('');

  /* =======================================================
     REFS
  ======================================================= */

  const fileInputRef =
    useRef(null);

  const chatListRef =
    useRef(null);

  const lastAssistantMsgRef =
    useRef(null);

  const prevLoadingRef =
    useRef(false);

  const chatSectionRef =
    useRef(null);

  const chatTextareaRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const mediaStreamRef =
    useRef(null);

  const recordingTimerRef =
    useRef(null);

  const recordingChunksRef =
    useRef([]);

  const discardRecordingRef =
    useRef(false);

  /* =======================================================
     LOAD MARKETS
  ======================================================= */

  useEffect(() => {
    fetchMarkets();
  }, []);

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
            `${API_BASE_URL}/ai/translate`,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const fetchMarkets = async () => {
    try {
      setMarketsLoading(true);
      setMarketsError('');

      const response =
        await fetch(
          `${API_BASE_URL}/markets`,
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          t(data.message) ||
            t('Unable to load markets.'),
        );
      }

      let marketList = [];

      if (Array.isArray(data)) {
        marketList = data;
      } else if (
        Array.isArray(data.data)
      ) {
        marketList =
          data.data;
      } else if (
        Array.isArray(
          data.markets,
        )
      ) {
        marketList =
          data.markets;
      }

      setMarkets(
        marketList,
      );

      const officialMarket =
        marketList.find(
          (market) =>
            market.isOfficial ===
            true,
        );

      if (officialMarket) {
        setSelectedMarketId(
          officialMarket._id,
        );
      } else if (
        marketList.length > 0
      ) {
        setSelectedMarketId(
          marketList[0]._id,
        );
      }
    } catch (error) {
      console.error(
        'Market Fetch Error:',
        error,
      );

      setMarketsError(
        t(error.message) ||
          t('Unable to load markets.'),
      );
    } finally {
      setMarketsLoading(false);
    }
  };

  /* =======================================================
     CHAT SCROLL
  ======================================================= */

  useEffect(() => {
    const list =
      chatListRef.current;

    if (!list) return;

    if (chatLoading) {
      // Show the newest content
      // (user message + Thinking…).
      list.scrollTo({
        top: list.scrollHeight,
        behavior: 'smooth',
      });
    } else if (
      prevLoadingRef.current
    ) {
      // New reply just arrived -
      // show the START of the
      // response, not the tail.
      const replyEl =
        lastAssistantMsgRef.current;

      if (replyEl) {
        const replyTop =
          replyEl.offsetTop -
          list.offsetTop;

        list.scrollTo({
          top: Math.max(
            0,
            replyTop - 8,
          ),
          behavior: 'smooth',
        });
      }
    }

    prevLoadingRef.current =
      chatLoading;
  }, [chatLoading]);

  /* =======================================================
     SCROLL TO CHAT ON ARRIVAL (?chat=1)
  ======================================================= */

  const { search: urlSearch } =
    useLocation();

  useEffect(() => {
    if (
      urlSearch &&
      urlSearch.includes(
        'chat=1',
      )
    ) {
      let second;

      const first =
        setTimeout(() => {
          chatSectionRef.current?.scrollIntoView(
            {
              behavior: 'smooth',
              block: 'start',
            },
          );

          second =
            setTimeout(() => {
              chatTextareaRef.current?.focus();
            }, 650);
        }, 250);

      return () => {
        clearTimeout(first);

        if (second) {
          clearTimeout(second);
        }
      };
    }
  }, [urlSearch]);

  /* =======================================================
     IMAGE SELECT
  ======================================================= */

  const handleImageSelect = (
    event,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (
      !allowedTypes.includes(
        file.type.toLowerCase(),
      )
    ) {
      alert(
        t('Please upload a JPEG, PNG, WebP, HEIC or HEIF image.'),
      );

      return;
    }

    const maxSize =
      25 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        t('Image size must be 25MB or less.'),
      );

      return;
    }

    setSelectedImage(file);

    setImageMimeType(
      file.type,
    );

    setAnalysisResult(null);

    setImageHint('');

    const reader =
      new FileReader();

    reader.onload = () => {
      const dataUrl =
        reader.result;

      if (
        /heic|heif/i.test(
          file.type,
        )
      ) {
        // Convert HEIC to JPEG in the browser when
        // the device can decode it (Chrome/Safari),
        // so preview and analysis always work.
        const probe =
          new Image();

        probe.onload = () => {
          try {
            const canvas =
              document.createElement(
                'canvas',
              );

            canvas.width =
              probe.naturalWidth ||
              probe.width;

            canvas.height =
              probe.naturalHeight ||
              probe.height;

            const ctx =
              canvas.getContext(
                '2d',
              );

            ctx.drawImage(
              probe,
              0,
              0,
            );

            const jpeg =
              canvas.toDataURL(
                'image/jpeg',
                0.9,
              );

            setImagePreview(
              jpeg,
            );

            setImageMimeType(
              'image/jpeg',
            );

            setImageHint(
              t('HEIC image converted to JPEG.'),
            );
          } catch (error) {
            setImagePreview(
              dataUrl,
            );

            setImageHint(
              t('HEIC preview may not display in this browser.'),
            );
          }
        };

        probe.onerror = () => {
          setImagePreview(
            dataUrl,
          );

          setImageHint(
            t('HEIC preview may not display in this browser.'),
          );
        };

        probe.src = dataUrl;
      } else {
        setImagePreview(
          dataUrl,
        );
      }
    };

    reader.readAsDataURL(file);
  };

  /* =======================================================
     CLEAR IMAGE
  ======================================================= */

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview('');
    setImageMimeType('');
    setAnalysisResult(null);
    setImageHint('');

    if (fileInputRef.current) {
      fileInputRef.current.value =
        '';
    }
  };

  /* =======================================================
     IMAGE ANALYSIS
  ======================================================= */

  const analyzeImage = async () => {
    if (!selectedImage) {
      alert(
        t('Please select a crop image first.'),
      );

      return;
    }

    if (!selectedMarketId) {
      alert(
        t('Please select the market where you plan to sell the crop.'),
      );

      return;
    }

    try {
      setImageLoading(true);
      setAnalysisResult(null);

      let imageData =
        imagePreview;

      if (
        imagePreview.includes(
          'base64,',
        )
      ) {
        imageData =
          imagePreview.split(
            'base64,',
          )[1];
      }

      const response =
        await fetch(
          `${API_BASE_URL}/ai/image/analyze`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              image:
                imageData,

              mimeType:
                imageMimeType,

              marketId:
                selectedMarketId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          t(data.error) ||
            t(data.message) ||
            t('Unable to analyze image.'),
        );
      }

      setAnalysisResult(
        data,
      );
    } catch (error) {
      console.error(
        'Image Analysis Error:',
        error,
      );

      alert(
        t(error.message) ||
          t('Unable to analyze the crop image.'),
      );
    } finally {
      setImageLoading(false);
    }
  };

  /* =======================================================
     CHAT SEND
  ======================================================= */

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
            `${API_BASE_URL}/ai/chat`,
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
            },
          ],
        );
      } catch (error) {
        console.error(
          'Chat Error:',
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
            },
          ],
        );
      } finally {
        setChatLoading(false);
      }
    };

  /* =======================================================
     CHAT KEYBOARD
  ======================================================= */

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

  /* =======================================================
     VOICE RECORDING
  ======================================================= */

  const clearRecordingTimer =
    () => {
      if (
        recordingTimerRef.current
      ) {
        clearInterval(
          recordingTimerRef.current,
        );

        recordingTimerRef.current =
          null;
      }
    };

  const stopMediaTracks =
    () => {
      if (
        mediaStreamRef.current
      ) {
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

  const stopVoiceRecording =
    () => {
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

  const cancelVoiceRecording =
    () => {
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
            `${API_BASE_URL}/ai/transcribe`,
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

          chatTextareaRef.current?.focus();
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

  /* =======================================================
     VOICE CLEANUP
  ======================================================= */

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
        } catch {
          /* ignore */
        }
      }

      stopMediaTracks();
    };
  }, []);

  /* =======================================================
     RESULT DATA
  ======================================================= */

  const parsedAnalysis =
    analysisResult?.analysis
      ? parseAnalysis(
          analysisResult.analysis,
        )
      : null;

  const marketData =
    analysisResult?.marketData;

  const indicativePrice =
    marketData?.indicativePrice;

  const selectedMarket =
    markets.find(
      (market) =>
        market._id ===
        selectedMarketId,
    );

  /* =======================================================
     QUALITY DISPLAY
  ======================================================= */

  let qualityDisplay = '—';

  if (
    analysisResult &&
    analysisResult.qualityScore !==
      undefined &&
    analysisResult.qualityScore !==
      null
  ) {
    qualityDisplay =
      `${analysisResult.qualityScore}/10`;
  } else if (
    parsedAnalysis?.quality
  ) {
    qualityDisplay =
      parsedAnalysis.quality;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="ai-assistant-page">

      {/* =================================================
          HERO
      ================================================= */}

      <section className="ai-hero">

        <div className="ai-hero-content">

          <div className="ai-hero-icon">
            <Sparkles size={30} />
          </div>

          <div>
            <h1>
              KrishiBandhu AI
            </h1>

            <p>
              {t('Your intelligent farming companion 🌾')}
            </p>
          </div>

        </div>

      </section>

      {/* =================================================
          IMAGE ANALYSIS
      ================================================= */}

      <section className="ai-analysis-section">

        <div className="ai-section-header">

          <div>

            <span className="ai-section-eyebrow">
              {t('AI VISION')}
            </span>

            <h2>
              {t('Analyze Your Crop')}
            </h2>

            <p>
              {t('Upload a crop image to assess visible quality and get an indicative market-price range in ₹/kg.')}
            </p>

          </div>

          <div className="ai-section-icon">
            <Camera size={24} />
          </div>

        </div>

        <div className="ai-analysis-card">

          {/* =============================================
              UPLOAD
          ============================================= */}

          <div className="ai-upload-area">

            {!imagePreview ? (
              <button
                type="button"
                className="ai-upload-box"
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >

                <div className="ai-upload-icon">
                  <ImagePlus size={30} />
                </div>

                <strong>
                  {t('Upload Crop Image')}
                </strong>

                <span>
                  JPEG, PNG, WebP, HEIC
                </span>

                <small>
                  {t('Maximum 25MB')}
                </small>

              </button>
            ) : (
              <div className="ai-image-preview-wrapper">

                <img
                  src={imagePreview}
                  alt={t('Selected crop')}
                  className="ai-image-preview"
                />

                <button
                  type="button"
                  className="ai-remove-image"
                  onClick={
                    clearImage
                  }
                  aria-label={t('Remove image')}
                >
                  <X size={18} />
                </button>

              </div>
            )}

            {imageHint && (
              <p className="ai-upload-hint">
                {imageHint}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={
                handleImageSelect
              }
              hidden
            />

          </div>

          {/* =============================================
              MARKET SELECTOR
          ============================================= */}

          <div className="ai-market-selector">

            <div className="ai-market-label">

              <div className="ai-market-label-icon">
                <MapPin size={18} />
              </div>

              <div>

                <strong>
                  {t('Select Selling Market')}
                </strong>

                <span>
                  {t('Choose the market where you plan to sell this crop.')}
                </span>

              </div>

            </div>

            <div className="ai-select-wrapper">

              <select
                value={
                  selectedMarketId
                }
                onChange={(event) =>
                  setSelectedMarketId(
                    event.target.value,
                  )
                }
                disabled={
                  marketsLoading ||
                  imageLoading
                }
                className="ai-market-select"
              >

                <option value="">
                  {marketsLoading
                    ? t('Loading markets...')
                    : t('Select a market')}
                </option>

                {markets.map(
                  (market) => (
                    <option
                      key={
                        market._id
                      }
                      value={
                        market._id
                      }
                    >
                      {market.name}
                      {market.district
                        ? ` — ${market.district}`
                        : ''}
                    </option>
                  ),
                )}

              </select>

              <ChevronDown
                size={18}
                className="ai-select-icon"
              />

            </div>

            {selectedMarket && (
              <div className="ai-selected-market">

                <MapPin size={14} />

                <span>
                  {selectedMarket.name}

                  {selectedMarket.district
                    ? `, ${selectedMarket.district}`
                    : ''}

                  {selectedMarket.state
                    ? `, ${selectedMarket.state}`
                    : ''}
                </span>

              </div>
            )}

            {marketsError && (
              <div className="ai-market-error">

                <CircleAlert
                  size={16}
                />

                <span>
                  {marketsError}
                </span>

                <button
                  type="button"
                  onClick={
                    fetchMarkets
                  }
                >
                  {t('Retry')}
                </button>

              </div>
            )}

          </div>

          {/* =============================================
              ANALYZE BUTTON
          ============================================= */}

          <button
            type="button"
            className="ai-analyze-button"
            onClick={
              analyzeImage
            }
            disabled={
              !selectedImage ||
              !selectedMarketId ||
              imageLoading
            }
          >

            {imageLoading ? (
              <>
                <Loader2
                  size={19}
                  className="spin"
                />

                {t('Analyzing Crop...')}
              </>
            ) : (
              <>
                <Sparkles
                  size={19}
                />

                {t('Analyze Crop')}
              </>
            )}

          </button>

          {/* =============================================
              ANALYSIS RESULT
          ============================================= */}

          {analysisResult && (
            <div className="ai-analysis-result">

              {/* =========================================
                  HEADER
              ========================================= */}

              <div className="ai-result-header">

                <div>

                  <span className="ai-section-eyebrow">
                    {t('ANALYSIS COMPLETE')}
                  </span>

                  <h3>
                    {t('Crop Assessment')}
                  </h3>

                </div>

                <CheckCircle2
                  size={28}
                  className="ai-success-icon"
                />

              </div>

              {/* =========================================
                  SCORE GRID
              ========================================= */}

              <div className="ai-score-grid">

                <div className="ai-score-card">

                  <span>
                    {t('Visual Quality')}
                  </span>

                  <strong>
                    {qualityDisplay}
                  </strong>

                </div>

                <div className="ai-condition-card">

                  <span>
                    {t('Overall Condition')}
                  </span>

                  <strong>
                    {parsedAnalysis?.overallQuality ||
                      '—'}
                  </strong>

                </div>

                <div className="ai-crop-card">

                  <span>
                    {t('Crop Identified')}
                  </span>

                  <strong>
                    {analysisResult.crop ||
                      parsedAnalysis?.crop ||
                      t('Unable to determine')}
                  </strong>

                </div>

              </div>

              {/* =========================================
                  INDICATIVE PRICE CARD
              ========================================= */}

              {marketData &&
              indicativePrice ? (
                <div className="ai-price-card">

                  <div className="ai-price-card-header">

                    <div>

                      <span className="ai-price-eyebrow">
                        {t('INDICATIVE SELLING PRICE')}
                      </span>

                      <h3>
                        {t('Expected Market Range')}
                      </h3>

                    </div>

                    <div className="ai-price-icon">
                      ₹
                    </div>

                  </div>

                  {/* =====================================
                      MAIN KG PRICE
                  ===================================== */}

                  <div className="ai-price-range">

                    <span>
                      ₹
                      {formatRupeesPerKg(
                        indicativePrice.minimum,
                      )}
                    </span>

                    <b>
                      –
                    </b>

                    <span>
                      ₹
                      {formatRupeesPerKg(
                        indicativePrice.maximum,
                      )}
                    </span>

                    <small>
                      {t('/ kg')}
                    </small>

                  </div>

                  <div className="ai-price-market">

                    <MapPin
                      size={15}
                    />

                    <span>
                      {marketData.market?.name ||
                        selectedMarket?.name ||
                        t('Selected market')}
                    </span>

                  </div>

                  {/* =====================================
                      MSAMB REFERENCE PRICES
                  ===================================== */}

                  <div className="ai-price-reference">

                    <div>

                      <span>
                        {t('MSAMB Minimum')}
                      </span>

                      <strong>
                        ₹
                        {formatRupeesPerKg(
                          marketData.minimumPrice,
                        )}
                        /kg
                      </strong>

                    </div>

                    <div>

                      <span>
                        {t('MSAMB Modal')}
                      </span>

                      <strong>
                        ₹
                        {formatRupeesPerKg(
                          marketData.modalPrice,
                        )}
                        /kg
                      </strong>

                    </div>

                    <div>

                      <span>
                        {t('MSAMB Maximum')}
                      </span>

                      <strong>
                        ₹
                        {formatRupeesPerKg(
                          marketData.maximumPrice,
                        )}
                        /kg
                      </strong>

                    </div>

                  </div>

                  {/* =====================================
                      MARKET METADATA
                  ===================================== */}

                  <div className="ai-price-meta">

                    <span>
                      {t('Source:')}{' '}
                      {marketData.source ||
                        'MSAMB'}
                    </span>

                    <span>
                      {t('Price date:')}{' '}
                      {marketData.priceDate
                        ? new Date(
                            marketData.priceDate,
                          ).toLocaleDateString(
                            'en-IN',
                          )
                        : '—'}
                    </span>

                    <span>
                      {t('Unit:')}{' '}
                      ₹/kg
                    </span>

                  </div>

                  {/* =====================================
                      DISCLAIMER
                  ===================================== */}

                  <div className="ai-price-disclaimer">

                    <CircleAlert
                      size={16}
                    />

                    <span>
                      {t('This is an indicative estimate based on visible crop quality and the latest available MSAMB market prices. Actual selling prices may vary by lot quality, quantity, buyer, arrivals and auction conditions.')}
                    </span>

                  </div>

                </div>
              ) : (
                <div className="ai-no-price-card">

                  <CircleAlert
                    size={20}
                  />

                  <div>

                    <strong>
                      {t('Market price unavailable')}
                    </strong>

                    <p>
                      {t("We analyzed the crop, but couldn't find a matching verified price for this crop at the selected market.")}
                    </p>

                  </div>

                </div>
              )}

              {/* =========================================
                  ASSESSMENT GRID
              ========================================= */}

              <div className="ai-assessment-grid">

                <div className="ai-assessment-card">

                  <div className="ai-assessment-title">

                    <Sprout
                      size={19}
                    />

                    <h4>
                      {t('Produce Condition')}
                    </h4>

                  </div>

                  <p>
                    {parsedAnalysis?.produceCondition ||
                      t('No additional visual assessment available.')}
                  </p>

                </div>

                <div className="ai-assessment-card">

                  <div className="ai-assessment-title">

                    <CircleAlert
                      size={19}
                    />

                    <h4>
                      {t('Visible Concerns')}
                    </h4>

                  </div>

                  <p>
                    {parsedAnalysis?.concerns ||
                      t('No major visible concerns reported.')}
                  </p>

                </div>

                <div className="ai-assessment-card">

                  <div className="ai-assessment-title">

                    <Sparkles
                      size={19}
                    />

                    <h4>
                      {t('Possible Issues')}
                    </h4>

                  </div>

                  <p>
                    {parsedAnalysis?.issues ||
                      t('No possible issues identified from the image.')}
                  </p>

                </div>

                <div className="ai-assessment-card">

                  <div className="ai-assessment-title">

                    <CheckCircle2
                      size={19}
                    />

                    <h4>
                      {t('Confidence')}
                    </h4>

                  </div>

                  <p>
                    {parsedAnalysis?.confidence ||
                      '—'}
                  </p>

                </div>

              </div>

              {/* =========================================
                  RECOMMENDATIONS
              ========================================= */}

              {parsedAnalysis?.recommendations && (
                <div className="ai-recommendations-card">

                  <div className="ai-assessment-title">

                    <Sprout
                      size={20}
                    />

                    <h4>
                      {t('Recommendations')}
                    </h4>

                  </div>

                  <MarkdownContent>
                    {
                      parsedAnalysis.recommendations
                    }
                  </MarkdownContent>

                </div>
              )}

              {/* =========================================
                  NOTE
              ========================================= */}

              {parsedAnalysis?.note && (
                <div className="ai-analysis-note">

                  <CircleAlert
                    size={16}
                  />

                  <span>
                    {parsedAnalysis.note}
                  </span>

                </div>
              )}

            </div>
          )}

        </div>

      </section>

      {/* =================================================
          AI CHAT
      ================================================= */}

      <section
          ref={chatSectionRef}
          className="ai-chat-section"
        >

        <div className="ai-section-header">

          <div>

            <span className="ai-section-eyebrow">
              {t('FARMING ASSISTANT')}
            </span>

            <h2>
              {t('Ask KrishiBandhu AI')}
            </h2>

            <p>
              {translatingHistory
                ? lang === 'mr'
                  ? 'चॅट भाषांतरित होत आहे…'
                  : lang === 'hi'
                    ? 'चैट अनुवाद हो रहा है…'
                    : 'Translating chat…'
                : t('Get help with farming, crops, markets and agricultural practices.')}
            </p>

          </div>

          <div className="ai-section-icon">
            {/* Same logo mark as the top KrishiBandhu navbar. */}
            <Leaf
              size={24}
              strokeWidth={2.2}
            />
          </div>

        </div>

        <div className="ai-chat-card">

          <div
            className="ai-chat-messages"
            ref={chatListRef}
          >

            {chatMessages.map(
              (message, index) => {
                const messageClass =
                  message.role ===
                  'user'
                    ? 'ai-chat-message user'
                    : 'ai-chat-message assistant';

                return (
                  <div
                    key={index}
                    className={
                      messageClass
                    }
                    ref={
                      index ===
                        chatMessages.length -
                          1 &&
                      message.role ===
                        'assistant'
                        ? lastAssistantMsgRef
                        : null
                    }
                  >

                    <div className="ai-chat-avatar">

                      {message.role ===
                      'user' ? (
                        t('You')
                      ) : (
                        <Sparkles
                          size={17}
                        />
                      )}

                    </div>

                    <div className="ai-chat-bubble">

                      <MarkdownContent>
                        {
                          message.content
                        }
                      </MarkdownContent>

                    </div>

                  </div>
                );
              },
            )}

            {chatLoading && (
              <div className="ai-chat-message assistant">

                <div className="ai-chat-avatar">

                  <Sparkles
                    size={17}
                  />

                </div>

                <div className="ai-chat-bubble ai-chat-loading">

                  <Loader2
                    size={18}
                    className="spin"
                  />

                  {t('Thinking...')}

                </div>

              </div>
            )}

          </div>

          {/* =========================================
              CHAT INPUT
          ========================================= */}

          {(isRecording ||
            isTranscribing) && (
            <div
              className={`ai-voice-status ${
                isTranscribing
                  ? 'transcribing'
                  : ''
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2
                    size={14}
                    className="spin"
                  />
                  {t('Transcribing your voice note...')}
                </>
              ) : (
                <>
                  <span className="ai-voice-pulse" />
                  <span>
                    {t('Recording... {0}s', recordingSeconds)}
                  </span>
                  <button
                    type="button"
                    className="ai-voice-cancel"
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

          <div className="ai-chat-input-area">

            <button
              type="button"
              className={`ai-mic-button ${
                isRecording
                  ? 'recording'
                  : ''
              }`}
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
                  size={16}
                  fill="currentColor"
                />
              ) : (
                <Mic size={19} />
              )}

            </button>

            <textarea
              ref={chatTextareaRef}
              value={chatInput}
              onChange={(event) =>
                setChatInput(
                  event.target.value,
                )
              }
              onKeyDown={
                handleChatKeyDown
              }
              placeholder={t('Ask about crops, farming, market prices...')}
              rows={1}
              disabled={
                chatLoading
              }
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
                  size={19}
                  className="spin"
                />
              ) : (
                <Send size={19} />
              )}

            </button>

          </div>

        </div>

      </section>

    </div>
  );
}

export default AIAssistant;