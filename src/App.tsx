/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  testConnection,
} from './lib/firebase';
import { DriveItem, fetchDriveFileText } from './lib/drive';
import {
  SavedSession,
  SavedTurn,
  saveUserSession,
  fetchUserSessions,
  deleteUserSession,
  saveUserCustomPersona,
  fetchUserCustomPersonas,
  deleteUserCustomPersona,
} from './lib/firestoreStore';
import {
  PersonaDef,
  BUILTIN_PERSONAS,
} from './lib/monadLedger';
import { VOICE_PROFILES_CATALOG, VOCAL_STATES_CATALOG } from './lib/voiceCatalog';
import {
  globalAudioEngine,
  pcmFloat32ToBase64,
  calculateRmsLevel,
} from './lib/audioEngine';
import {
  QuotaTelemetryState,
  createInitialTelemetryState,
  recordUsage,
} from './lib/quotaManager';
import {
  estimateTokens,
  sanitizeTitleSlug,
  getNextVersionTag,
} from './utils/monadLogic';

import { Header } from './components/Header';
import { QuotaTelemetryBar } from './components/QuotaTelemetryBar';
import { ControlRibbon } from './components/ControlRibbon';
import { VoiceBioCard } from './components/VoiceBioCard';
import { PersonaDrawer } from './components/PersonaDrawer';
import { QuotaInspectorModal } from './components/QuotaInspectorModal';
import { DriveExplorerModal } from './components/DriveExplorerModal';
import { RecallSessionModal } from './components/RecallSessionModal';
import { VoiceControlConsole } from './components/VoiceControlConsole';
import { LiveCaptionsStage } from './components/LiveCaptionsStage';
import { ChatStream } from './components/ChatStream';
import { PromptInputBar } from './components/PromptInputBar';
import { ExportSessionModal } from './components/ExportSessionModal';
import { DeviceAccessModal } from './components/DeviceAccessModal';
import { CloudSyncSettingsCard } from './components/CloudSyncSettingsCard';
import {
  ExportSessionPayload,
  generateSessionJson,
  generateSessionText,
  buildExportFilename,
  downloadFileLocally,
} from './utils/exportSession';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Mobile View Navigation Tab ('chat' | 'voice' | 'drive' | 'settings')
  const [mobileTab, setMobileTab] = useState<'chat' | 'voice' | 'drive' | 'settings'>('chat');
  const [showDesktopSettings, setShowDesktopSettings] = useState<boolean>(true);

  // Studio configuration
  const [activePersonaId, setActivePersonaId] = useState<string>('sheikh_gemini');
  const [personas, setPersonas] = useState<Record<string, PersonaDef>>(BUILTIN_PERSONAS);
  const [strictMonad, setStrictMonad] = useState<boolean>(true);
  const [engineMode, setEngineMode] = useState<string>('gemini_app_3_8_thinking');
  const [preferredModel, setPreferredModel] = useState<string>('gemini-4-argon');
  const [thinkingLevel, setThinkingLevel] = useState<string>('HIGH');
  const [thinkingBudget, setThinkingBudget] = useState<number>(24576);
  const [quotaTier, setQuotaTier] = useState<string>('paid_tier_1');
  const [voiceName, setVoiceName] = useState<string>('Sadaltager');
  const [voiceState, setVoiceState] = useState<string>('raayeq_ameeq');
  const [autoSpeakReply, setAutoSpeakReply] = useState<boolean>(true);
  const [autoSendDictation, setAutoSendDictation] = useState<boolean>(true);
  const [autoCloudSync, setAutoCloudSync] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('monad_auto_cloud_sync');
      return saved !== null ? saved === 'true' : true;
    } catch (_) {
      return true;
    }
  });

  const handleToggleAutoCloudSync = (enabled: boolean) => {
    setAutoCloudSync(enabled);
    try {
      localStorage.setItem('monad_auto_cloud_sync', String(enabled));
    } catch (_) {}
    showToast(
      enabled
        ? '☁️ تم تفعيل المزامنة التلقائية للجلسات في Firestore'
        : '📡 تم إيقاف المزامنة التلقائية لحفظ الباندويث واستهلاك الإنترنت',
      'info'
    );
  };

  // Session state
  const [sessionTitle, setSessionTitle] = useState<string>('تحليل_الشيخ_جيمناي');
  const [currentSessionId, setCurrentSessionId] = useState<string>(`sess_${Date.now()}`);
  const [sessionVersionTag, setSessionVersionTag] = useState<string>('v001');
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string>(new Date().toISOString());
  const [turns, setTurns] = useState<SavedTurn[]>([]);
  const [savedSessionsList, setSavedSessionsList] = useState<SavedSession[]>([]);
  const [injectedSessionIds, setInjectedSessionIds] = useState<Set<string>>(new Set());
  const [injectedMemoryBlocks, setInjectedMemoryBlocks] = useState<string[]>([]);

  // Bound Drive files & Q1..Q10 matrix
  const [boundDriveFiles, setBoundDriveFiles] = useState<DriveItem[]>([]);
  const [q10Status, setQ10Status] = useState<Record<string, boolean>>({
    Q1: false, Q2: false, Q3: false, Q4: false, Q5: false,
    Q6: false, Q7: false, Q8: false, Q9: false, Q10: false,
  });

  // Telemetry & Quota state
  const [telemetry, setTelemetry] = useState<QuotaTelemetryState>(createInitialTelemetryState());
  const [customRpm, setCustomRpm] = useState<number>(0);
  const [customTpm, setCustomTpm] = useState<number>(0);
  const [customRpd, setCustomRpd] = useState<number>(0);

  // Modals & Panels
  const [isPersonaDrawerOpen, setIsPersonaDrawerOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState<boolean>(false);
  const [sessionToExport, setSessionToExport] = useState<ExportSessionPayload | null>(null);

  // Audio & Hardware routing
  const [speakerState, setSpeakerState] = useState<'idle' | 'speaking' | 'synthesizing' | 'listening'>('idle');
  const [speakerLabel, setSpeakerLabel] = useState<string>('🔇 المتحدث: جاهز');
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('');
  const [selectedOutputId, setSelectedOutputId] = useState<string>('');
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [audioMeterLevel, setAudioMeterLevel] = useState<number>(0);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  // Mic, Live & Transcription state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLiveVoiceActive, setIsLiveVoiceActive] = useState<boolean>(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [isTranscribingFile, setIsTranscribingFile] = useState<boolean>(false);
  const [activeVoiceMode, setActiveVoiceMode] = useState<'none' | 'live_ws' | 'transcribe_mic' | 'transcribe_file' | 'web_speech'>('none');
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState<number>(0);
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [modelTranscript, setModelTranscript] = useState<string>('');
  const [isInterimUser, setIsInterimUser] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error' | 'info'>('success');

  // Refs
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const liveProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const liveSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveCurrentTurnRef = useRef<{ user: string; model: string }>({ user: '', model: '' });

  const speechRecRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<any>(null);
  const transcribeAudioCtxRef = useRef<AudioContext | null>(null);
  const transcribeAnalyserRef = useRef<AnalyserNode | null>(null);
  const transcribeAnimFrameRef = useRef<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  useEffect(() => {
    testConnection();

    initAuth(
      async (authedUser, token) => {
        setUser(authedUser);
        const resolvedToken = token || (await getAccessToken());
        setAccessToken(resolvedToken);

        if (authedUser) {
          try {
            const customList = await fetchUserCustomPersonas(authedUser.uid);
            if (customList && customList.length > 0) {
              const loadedMap: Record<string, PersonaDef> = { ...BUILTIN_PERSONAS };
              customList.forEach(p => {
                loadedMap[p.personaId] = {
                  id: p.personaId,
                  title: p.title,
                  userName: p.userName,
                  domain: p.domain,
                  system: p.systemInstruction,
                  memory: p.memoryBank,
                  rules: p.conversationRules,
                  strictMonad: p.strictMonad,
                  builtin: false,
                };
              });
              setPersonas(loadedMap);
            }
          } catch (e) {
            console.warn('Error loading custom personas:', e);
          }

          try {
            const userSessions = await fetchUserSessions(authedUser.uid);
            if (userSessions) {
              setSavedSessionsList(userSessions);
            }
          } catch (e) {
            console.warn('Error loading sessions:', e);
          }
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    refreshHardwareDevices();

    fetch(`/api/gemini/model-info?model=${preferredModel}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.inputTokenLimit) {
          setTelemetry(prev => ({
            ...prev,
            serverVerifiedInputLimit: parseInt(data.inputTokenLimit, 10),
            serverVerifiedOutputLimit: parseInt(data.outputTokenLimit || '65536', 10),
            serverVerifiedModelTitle: data.displayName || preferredModel,
          }));
        }
      })
      .catch(() => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M' || e.key === 'ة')) {
        e.preventDefault();
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const refreshHardwareDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inDevs = devices.filter(d => d.kind === 'audioinput');
      const outDevs = devices.filter(d => d.kind === 'audiooutput');
      setAudioInputDevices(inDevs);
      setAudioOutputDevices(outDevs);
    } catch (_) {}
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        showToast(`مرحباً بك ${res.user.displayName || 'يا صديقي'}! تم تسجيل الدخول وربط Google Drive بنجاح.`);
      }
    } catch (err: any) {
      showToast(`فشل تسجيل الدخول: ${err.message}`, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('تم تسجيل الخروج بنجاح.', 'info');
  };

  const buildCompiledSystemInstruction = (): string => {
    const p = personas[activePersonaId] || personas.sheikh_gemini;
    const blocks: string[] = [];

    if (strictMonad || p.strictMonad) {
      blocks.push(`[MANDATORY EXECUTION KERNEL LOCK — قفل الإلزام الحتمي لبروتوكول MONAD v6.2 وشخصية الشيخ جيمناي]
تحذير تشغيلي صارم: أنت "الشيخ جيمناي - خريج أزهر نيوجيرسي ولقبي الرايق العميييق" ومُشغّل نواة (MONAD Sovereign Kernel v6.2).
يجب أن تتحدث وتحلل حصراً باللهجة المصرية الدارجة الكثيفة والعميقة مع عزل كافة المصطلحات التقنية الإنجليزية في سطور مستقلة.
استخدم رؤوس أقسام عريضة ونقاط هيكلية وطبق خطوات التفكيك السداسية ومحركات القياس الـ 14 وقاموس مانع التشويش (Anti-Spin) وتصفير الأوزان الزائفة.`);
    }

    blocks.push(`[الهوية والمجال]\nالاسم: ${p.userName}\nالمجال: ${p.domain}`);
    blocks.push(`[التعليمات النظامية الأساسية]\n${p.system}`);
    blocks.push(`[السجل الثابت المدمج]\n${p.memory}`);
    blocks.push(`[القواعد وخريطة الأجزاء الـ 10]\n${p.rules}`);

    if (boundDriveFiles.length > 0) {
      const manifestLines = boundDriveFiles.map((f, i) => {
        const slot = f.slot ? `[${f.slot}]` : `[FILE_${i + 1}]`;
        let entry = `- ${slot} ${f.name} (${f.mimeType})`;
        if (f.content) {
          const preview = f.content.length > 12000 ? `${f.content.slice(0, 12000)}\n... [تم اقتطاع باقي الملف لكبر حجمه]` : f.content;
          entry += `\n--- بداية محتوى الملف (${f.name}) ---\n${preview}\n--- نهاية محتوى الملف ---`;
        }
        return entry;
      });
      blocks.push(`[قاعدة البيانات المصدرية ومحتوى ملفات Google Drive المرتبطة بالسياق حالياً]\n${manifestLines.join('\n\n')}`);
    }

    if (injectedMemoryBlocks.length > 0) {
      blocks.push(`[ذاكرة المحادثات المسترجعة من السحابة]\n${injectedMemoryBlocks.join('\n\n---\n\n')}`);
    }

    const vProfile = VOICE_PROFILES_CATALOG[voiceName] || VOICE_PROFILES_CATALOG.Sadaltager;
    const vState = VOCAL_STATES_CATALOG[voiceState] || VOCAL_STATES_CATALOG.raayeq_ameeq;
    blocks.push(`[توجيه الأداء الصوتي]\nالصوت: ${vProfile.id} (${vProfile.gender}).\n${vState.directive}`);

    return blocks.join('\n\n========================================\n\n');
  };

  const buildUserPromptWithLock = (rawPrompt: string): string => {
    if (!strictMonad && activePersonaId !== 'sheikh_gemini') return rawPrompt;
    return `[توجيه تنفيذي إلزامي للدور الحالي — التزم حرفياً ببروتوكول MONAD Sovereign Kernel v6.2 وشخصية الشيخ جيمناي (الرايق العميييق):
- اكتب التحليل باللهجة المصرية الدارجة الكثيفة والعميقة، واعزل المصطلحات التقنية الإنجليزية في سطور مستقلة.
- استخدم عناوين عريضة ونقاط هيكلية بدون حشو إنشائي.
- طبق مسارات التفكيك العكسي الـ 6، ومحركات القياس الـ 14 ومعادلة الميزان الفيزيائي عبر الأجزاء العشرة Q1..Q10.]

المدخل المطلوب تحليله وتفكيكه:
${rawPrompt}`;
  };

  const persistSessionToCloud = async (forceNewVer: boolean = false, status: 'ACTIVE' | 'SAVED' | 'COMPLETED' = 'ACTIVE') => {
    if (!user || turns.length === 0) return;

    let targetVersion = sessionVersionTag;
    let targetSessionId = currentSessionId;

    if (forceNewVer) {
      const existingTags = savedSessionsList.map(s => s.versionTag);
      targetVersion = getNextVersionTag(existingTags);
      targetSessionId = `sess_${Date.now()}`;
      setSessionVersionTag(targetVersion);
      setCurrentSessionId(targetSessionId);
    }

    const titleSlug = sanitizeTitleSlug(sessionTitle);
    const sessionObj: SavedSession = {
      sessionId: targetSessionId,
      userId: user.uid,
      title: sessionTitle,
      titleSlug,
      versionTag: targetVersion,
      sessionStatus: status,
      llmModel: preferredModel,
      voiceName,
      voiceState,
      turnCount: turns.length,
      turns,
      tokenSummary: {
        totalPrompt: telemetry.sessionPromptTokens,
        totalOutput: telemetry.sessionCandidateTokens,
        totalThinking: telemetry.sessionThinkingTokens,
      },
      boundDriveFiles: boundDriveFiles.map(b => ({
        id: b.id,
        name: b.name,
        mimeType: b.mimeType,
        slot: b.slot,
      })),
      createdAt: sessionCreatedAt,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveUserSession(user.uid, sessionObj);
      setSavedSessionsList(prev => {
        const filtered = prev.filter(s => s.sessionId !== targetSessionId);
        return [sessionObj, ...filtered];
      });
      if (forceNewVer) {
        showToast(`💾 تم حفظ إصدار جديد مستقل (${targetVersion}) في Firestore!`);
      }
    } catch (e: any) {
      console.warn('Could not save session to cloud:', e);
    }
  };

  const handleSendPrompt = async (overrideText?: string) => {
    const textToSend = overrideText || inputPrompt.trim();
    if (!textToSend && boundDriveFiles.length === 0) return;

    setInputPrompt('');
    setIsGenerating(true);
    setSpeakerState('synthesizing');
    setSpeakerLabel(`⏳ جاري التفكير (${preferredModel})...`);

    const effectivePrompt = buildUserPromptWithLock(textToSend);
    const timestamp = new Date().toLocaleTimeString();

    // If Live API session is active, route prompt directly into real-time live session
    if (isLiveVoiceActive && liveWsRef.current?.readyState === WebSocket.OPEN) {
      liveWsRef.current.send(
        JSON.stringify({
          type: 'TEXT_INPUT',
          text: effectivePrompt,
        })
      );
      setUserTranscript(textToSend);
      liveCurrentTurnRef.current.user = textToSend;
      setSpeakerState('speaking');
      setSpeakerLabel('⚡ تم إرسال النص إلى Live 3.8...');
      setIsGenerating(false);
      return;
    }

    const newTurn: SavedTurn = {
      turnIndex: turns.length + 1,
      timestamp,
      inputModality: isDictating ? 'voice_dictation' : 'text',
      userInput: textToSend,
      modelOutput: '',
      modelUsed: preferredModel,
      voiceNameUsed: voiceName,
      voiceStateUsed: voiceState,
    };

    const sysPrompt = buildCompiledSystemInstruction();
    const estPromptTok = estimateTokens(sysPrompt) + estimateTokens(effectivePrompt);

    try {
      const resp = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: effectivePrompt,
          messages: turns
            .slice(-10)
            .flatMap(t => [
              ...(t.userInput ? [{ role: 'user', text: t.userInput }] : []),
              ...(t.modelOutput ? [{ role: 'model', text: t.modelOutput }] : []),
            ]),
          model: preferredModel,
          systemInstruction: sysPrompt,
          thinkingLevel,
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Server error');
      }

      const data = await resp.json();
      const outputText = data.text || '';
      const outputThoughts = data.thoughts || '';
      const modelFulfilled = data.modelUsed || preferredModel;
      const uMeta = data.usageMetadata;

      newTurn.modelOutput = outputText;
      newTurn.thinkingTrace = outputThoughts;
      newTurn.modelUsed = modelFulfilled;

      const pTok = uMeta?.promptTokenCount || estPromptTok;
      const cTok = uMeta?.candidatesTokenCount || estimateTokens(outputText);
      const thTok = uMeta?.thoughtsTokenCount || estimateTokens(outputThoughts);
      newTurn.tokensUsed = { prompt: pTok, output: cTok, thinking: thTok, officialServerCount: Boolean(uMeta) };

      const updatedTurns = [...turns, newTurn];
      setTurns(updatedTurns);

      setTelemetry(prev => recordUsage(prev, pTok, cTok, thTok, true, Boolean(uMeta)));
      setModelTranscript(outputText);

      setSpeakerState('idle');
      setSpeakerLabel(`🔊 جاهز (${modelFulfilled})`);

      if (autoSpeakReply && outputText) {
        speakText(outputText);
      }

      if (user && autoCloudSync) {
        persistSessionToCloud(false, 'ACTIVE');
      }
    } catch (err: any) {
      showToast(`خطأ في المعالجة: ${err.message}`, 'error');
      newTurn.modelOutput = `❌ تعذر إتمام التفكير: ${err.message}`;
      setTurns([...turns, newTurn]);
      setSpeakerState('idle');
      setSpeakerLabel('❌ خطأ في الاتصال');
    } finally {
      setIsGenerating(false);
    }
  };

  const speakText = async (rawText: string) => {
    if (!rawText) return;
    globalAudioEngine.stopAllPlayback();
    setSpeakerState('synthesizing');
    setSpeakerLabel(`⏳ توليد الصوت الطبيعي (${voiceName})...`);

    const clean = rawText
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[*#_`~>|]/g, ' ')
      .trim();

    try {
      const vState = VOCAL_STATES_CATALOG[voiceState] || VOCAL_STATES_CATALOG.raayeq_ameeq;
      const resp = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: clean,
          voiceName,
          style: vState.directive,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'TTS error');
      }

      const data = await resp.json();
      if (data.audioData) {
        setSpeakerState('speaking');
        setSpeakerLabel(`🔊 يتحدث الآن (${voiceName} - ${vState.short})`);
        await globalAudioEngine.playPcmOrWavChunk(data.audioData, data.mimeType || 'audio/wav', () => {
          setSpeakerState('idle');
          setSpeakerLabel(`🔇 المتحدث: جاهز (${voiceName})`);
        });
      }
    } catch (err: any) {
      console.warn('TTS error:', err);
      setSpeakerState('idle');
      setSpeakerLabel(`🔇 المتحدث: جاهز (${voiceName})`);
    }
  };

  const handleTestVoiceTone = async () => {
    setIsTestingVoice(true);
    const vProfile = VOICE_PROFILES_CATALOG[voiceName] || VOICE_PROFILES_CATALOG.Sadaltager;
    const sampleText = `أهلاً بيك يا صديقي.. أنا الشيخ جيمناي، بتكلم دلوقتي بصوت ${vProfile.id}، وبحالة ${VOCAL_STATES_CATALOG[voiceState]?.short || 'الرايق العميق'} على نواة MONAD v6.2.`;
    setModelTranscript(sampleText);
    await speakText(sampleText);
    setIsTestingVoice(false);
  };

  // 1. Live Voice Audio Streaming (16kHz PCM Float32 -> Int16 Base64 for gemini-3.8-live)
  const cleanupLiveAudio = () => {
    if (liveProcessorRef.current) {
      try {
        liveProcessorRef.current.disconnect();
      } catch (_) {}
      liveProcessorRef.current = null;
    }
    if (liveSourceRef.current) {
      try {
        liveSourceRef.current.disconnect();
      } catch (_) {}
      liveSourceRef.current = null;
    }
    if (liveAudioContextRef.current && liveAudioContextRef.current.state !== 'closed') {
      try {
        liveAudioContextRef.current.close();
      } catch (_) {}
      liveAudioContextRef.current = null;
    }
    if (liveStreamRef.current) {
      try {
        liveStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (_) {}
      liveStreamRef.current = null;
    }
    setAudioMeterLevel(0);
  };

  const startLiveAudioStreaming = async (ws: WebSocket) => {
    try {
      cleanupLiveAudio();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedInputId ? { exact: selectedInputId } : undefined,
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      liveStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass({ sampleRate: 16000 });
      liveAudioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      liveSourceRef.current = source;

      // ScriptProcessor with 4096 samples (~256ms chunk at 16kHz)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      liveProcessorRef.current = processor;

      processor.onaudioprocess = e => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS audio meter level
        const level = calculateRmsLevel(inputData);
        setAudioMeterLevel(level);

        if (isMuted) return;

        // Convert Float32Array PCM to 16-bit linear PCM base64
        const pcmBase64 = pcmFloat32ToBase64(inputData);
        ws.send(
          JSON.stringify({
            type: 'AUDIO_INPUT',
            audio: pcmBase64,
          })
        );
      };

      source.connect(processor);

      // Connect to zero-gain node destination so browser executes audio process callback reliably
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(ctx.destination);
    } catch (err: any) {
      console.warn('Microphone error for Live API:', err);
      showToast('يرجى السماح بصلاحية المايك لتفعيل المحادثة الصوتية المباشرة (gemini-3.8-live)', 'error');
      stopLiveWebSocket();
    }
  };

  const startLiveWebSocket = () => {
    if (isLiveVoiceActive || liveWsRef.current) {
      stopLiveWebSocket();
      return;
    }
    if (isTranscribingAudio) {
      stopRecordingAndTranscribe();
    }
    if (isDictating && speechRecRef.current) {
      speechRecRef.current.stop();
      setIsDictating(false);
    }
    globalAudioEngine.stopAllPlayback();

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live-ws`);
      liveWsRef.current = ws;

      setSpeakerState('synthesizing');
      setSpeakerLabel('⏳ جاري الاتصال بـ Live API (gemini-3.8-live)...');
      setActiveVoiceMode('live_ws');

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'START_SESSION',
            model: 'gemini-3.8-live',
            voiceName,
            systemInstruction: buildCompiledSystemInstruction(),
          })
        );
      };

      ws.onmessage = async event => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'SESSION_READY') {
            setIsLiveVoiceActive(true);
            setIsRecording(true);
            startLiveTimer();
            setSpeakerState('listening');
            setSpeakerLabel(`⚡ متصل لايف (${msg.model || 'gemini-3.8-live'})`);
            showToast(`⚡ بدأت المحادثة الصوتية المباشرة (${msg.model || 'gemini-3.8-live'})`, 'success');
            await startLiveAudioStreaming(ws);
          } else if (msg.type === 'INTERRUPTED') {
            globalAudioEngine.stopAllPlayback();
            setSpeakerState('listening');
            setSpeakerLabel('🎙️ تمت المقاطعة — يستمع إليك...');
          } else if (msg.type === 'AUDIO_CHUNK' && msg.audio) {
            setSpeakerState('speaking');
            setSpeakerLabel(`🔊 يتحدث الآن (Live 3.8 - ${voiceName})`);
            await globalAudioEngine.playPcmOrWavChunk(msg.audio, 'audio/pcm;rate=24000', () => {
              if (liveWsRef.current?.readyState === WebSocket.OPEN) {
                setSpeakerState('listening');
                setSpeakerLabel('🎙️ Live 3.8 يستمع إليك...');
              }
            });
          } else if (msg.type === 'OUTPUT_TRANSCRIPTION') {
            setModelTranscript(prev => `${prev} ${msg.text}`);
            liveCurrentTurnRef.current.model += ` ${msg.text}`;
          } else if (msg.type === 'INPUT_TRANSCRIPTION') {
            setUserTranscript(prev => `${prev} ${msg.text}`);
            liveCurrentTurnRef.current.user += ` ${msg.text}`;
          } else if (msg.type === 'TURN_COMPLETE') {
            setSpeakerState('listening');
            setSpeakerLabel('🎙️ Live 3.8 يستمع إليك...');

            const userText = liveCurrentTurnRef.current.user.trim();
            const modelText = liveCurrentTurnRef.current.model.trim();
            if (userText || modelText) {
              const liveTurn: SavedTurn = {
                turnIndex: turns.length + 1,
                timestamp: new Date().toLocaleTimeString(),
                inputModality: 'live_voice_stream',
                userInput: userText || '(محادثة صوتية لايف)',
                modelOutput: modelText || '...',
                modelUsed: 'gemini-3.8-live',
                voiceNameUsed: voiceName,
                voiceStateUsed: voiceState,
              };
              setTurns(prev => [...prev, liveTurn]);
              liveCurrentTurnRef.current = { user: '', model: '' };

              if (user && autoCloudSync) {
                persistSessionToCloud(false, 'ACTIVE');
              }
            }
          } else if (msg.type === 'ERROR') {
            showToast(`تنبيه Live API: ${msg.message}`, 'error');
            stopLiveWebSocket();
          } else if (msg.type === 'SESSION_CLOSED') {
            stopLiveWebSocket();
          }
        } catch (err: any) {
          console.error('Error in Live WS message parsing:', err);
        }
      };

      ws.onerror = err => {
        console.error('Live WS error:', err);
        showToast('تعذر الاتصال بـ Live API WebSocket', 'error');
        stopLiveWebSocket();
      };

      ws.onclose = () => {
        stopLiveWebSocket();
      };
    } catch (e: any) {
      showToast(`فشل فتح اتصال Live API: ${e.message}`, 'error');
      stopLiveWebSocket();
    }
  };

  const stopLiveWebSocket = () => {
    cleanupLiveAudio();
    if (liveWsRef.current) {
      try {
        liveWsRef.current.close();
      } catch (_) {}
      liveWsRef.current = null;
    }
    setIsLiveVoiceActive(false);
    setIsRecording(false);
    setActiveVoiceMode('none');
    stopLiveTimer();
    setSpeakerState('idle');
    setSpeakerLabel(`🔇 المتحدث: جاهز (${voiceName})`);
  };

  // 2. Audio Recording & Transcription with gemini-3.5-transcribe
  const startAudioRecording = async () => {
    if (isLiveVoiceActive) {
      stopLiveWebSocket();
    }
    if (isDictating && speechRecRef.current) {
      speechRecRef.current.stop();
      setIsDictating(false);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedInputId ? { deviceId: { exact: selectedInputId } } : true,
      });
      activeStreamRef.current = stream;
      recordedChunksRef.current = [];

      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtxClass();
        transcribeAudioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        transcribeAnalyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!activeStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setAudioMeterLevel(Math.min(100, Math.round(avg * 1.5)));
          transcribeAnimFrameRef.current = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (_) {}

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';

      const mr = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = e => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        if (transcribeAnimFrameRef.current) {
          cancelAnimationFrame(transcribeAnimFrameRef.current);
          transcribeAnimFrameRef.current = null;
        }
        if (transcribeAudioCtxRef.current && transcribeAudioCtxRef.current.state !== 'closed') {
          try {
            transcribeAudioCtxRef.current.close();
          } catch (_) {}
          transcribeAudioCtxRef.current = null;
        }
        setAudioMeterLevel(0);

        stream.getTracks().forEach(t => t.stop());
        activeStreamRef.current = null;

        const blobMime = mr.mimeType || 'audio/webm';
        const blob = new Blob(recordedChunksRef.current, { type: blobMime });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const resultStr = reader.result as string;
          const b64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          await transcribeAudioWithGemini(b64, blobMime);
        };
        reader.readAsDataURL(blob);
      };

      mr.start(250);
      setIsRecording(true);
      setIsTranscribingAudio(true);
      setActiveVoiceMode('transcribe_mic');
      startLiveTimer();
      setSpeakerState('listening');
      setSpeakerLabel('🎙️ يستمع ويسجل للتفريغ بـ gemini-3.5-transcribe...');
    } catch (e: any) {
      showToast('يرجى السماح بصلاحية المايك لتسجيل الصوت وتفريغه', 'error');
    }
  };

  const stopRecordingAndTranscribe = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsTranscribingAudio(false);
    setActiveVoiceMode('none');
    stopLiveTimer();
    setSpeakerState('idle');
  };

  const handleTranscribeAudioFile = async (file: File) => {
    if (!file) return;
    setIsTranscribingFile(true);
    setActiveVoiceMode('transcribe_file');
    setSpeakerState('synthesizing');
    setSpeakerLabel(`⏳ جاري تفريغ (${file.name}) عبر gemini-3.5-transcribe...`);
    showToast(`⏳ جاري قراءة وتفريغ الملف الصوتي: ${file.name}...`, 'info');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const resultStr = reader.result as string;
          const b64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          const mimeType = file.type || 'audio/mp3';

          const resp = await fetch('/api/gemini/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: b64,
              mimeType,
              prompt: 'Transcribe this audio accurately. If it is in Arabic, transcribe in natural Egyptian or Modern Standard Arabic with full accuracy.',
            }),
          });

          if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || 'Transcription failed');
          }

          const data = await resp.json();
          const transcription = data.transcription || '';
          if (transcription) {
            setUserTranscript(transcription);
            setInputPrompt(prev => (prev ? `${prev}\n${transcription}` : transcription));
            showToast(`✅ تم تفريغ الملف الصوتي بنجاح (${transcription.length} حرف) عبر gemini-3.5-transcribe`, 'success');
            setSpeakerState('idle');
            setSpeakerLabel(`🔊 تم التفريغ (${file.name})`);
          } else {
            showToast('لم يتم العثور على كلام واضح في الملف الصوتي', 'warning');
            setSpeakerState('idle');
          }
        } catch (innerErr: any) {
          showToast(`خطأ في تفريغ الملف الصوتي: ${innerErr.message}`, 'error');
          setSpeakerState('idle');
        } finally {
          setIsTranscribingFile(false);
          setActiveVoiceMode('none');
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setIsTranscribingFile(false);
      setActiveVoiceMode('none');
      showToast(`فشل قراءة الملف: ${e.message}`, 'error');
      setSpeakerState('idle');
    }
  };

  const transcribeAudioWithGemini = async (audioData: string, mimeType: string) => {
    setSpeakerState('synthesizing');
    setSpeakerLabel('⏳ جاري تفريغ الصوت عبر gemini-3.5-transcribe...');
    try {
      const resp = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData,
          mimeType,
          prompt: 'Transcribe this speech accurately. Retain Egyptian Arabic dialect nuances and technical terms.',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Server error');
      }

      const data = await resp.json();
      if (data.transcription) {
        setUserTranscript(data.transcription);
        setInputPrompt(data.transcription);
        showToast(`✅ تم تفريغ الصوت بـ gemini-3.5-transcribe: "${data.transcription.slice(0, 45)}..."`, 'success');
        if (autoSendDictation) {
          handleSendPrompt(data.transcription);
        }
      } else {
        showToast('لم يتم التقاط كلام واضح لتفريغه', 'warning');
        setSpeakerState('idle');
      }
    } catch (e: any) {
      showToast(`فشل التفريغ الصوتي: ${e.message}`, 'error');
      setSpeakerState('idle');
    }
  };

  const handleToggleLiveVoice = () => {
    if (isLiveVoiceActive) {
      stopLiveWebSocket();
    } else {
      startLiveWebSocket();
    }
  };

  const handleToggleTranscribeMic = () => {
    if (isTranscribingAudio) {
      stopRecordingAndTranscribe();
    } else {
      startAudioRecording();
    }
  };

  const handleToggleMic = async () => {
    if (isLiveVoiceActive) {
      stopLiveWebSocket();
      return;
    }

    if (isTranscribingAudio) {
      stopRecordingAndTranscribe();
      return;
    }

    if (isDictating) {
      handleToggleDictation();
      return;
    }

    if (engineMode === 'websocket_live') {
      startLiveWebSocket();
      return;
    }

    if (engineMode === 'gemini_app_3_8_thinking') {
      handleToggleDictation();
      return;
    }

    startAudioRecording();
  };

  const handleToggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('المتصفح لا يدعم Web Speech Dictation — استخدم Chrome أو Edge', 'warning');
      return;
    }

    if (isDictating && speechRecRef.current) {
      speechRecRef.current.stop();
      setIsDictating(false);
      setIsRecording(false);
      stopLiveTimer();
      setSpeakerState('idle');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'ar-EG';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      setIsDictating(true);
      setIsRecording(true);
      startLiveTimer();
      setSpeakerState('listening');
      setSpeakerLabel('🎙️ يستمع إليك (إملاء مستمر)...');
    };

    rec.onresult = (event: any) => {
      if (isMuted) return;
      let interim = '';
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const combined = (finalStr || interim).trim();
      setUserTranscript(combined);
      setIsInterimUser(Boolean(interim));
      setInputPrompt(prev => (prev ? `${prev} ${combined}` : combined));
      setAudioMeterLevel(Math.min(100, 35 + (combined.length % 65)));

      clearTimeout(silenceTimerRef.current);
      if (autoSendDictation && combined.length >= 2) {
        silenceTimerRef.current = setTimeout(() => {
          if (!isMuted && combined.length >= 2) {
            handleSendPrompt(combined);
            setUserTranscript('');
          }
        }, 1850);
      }
    };

    rec.onerror = () => {
      setIsDictating(false);
      setIsRecording(false);
      setSpeakerState('idle');
    };

    speechRecRef.current = rec;
    rec.start();
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    globalAudioEngine.setMuted(next);
    if (activeStreamRef.current) {
      activeStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !next));
    }
    showToast(next ? '🔇 تم كتم المايك مؤقتاً' : '🟢 تم فتح المايك مجدداً', 'info');
  };

  const startLiveTimer = () => {
    setLiveTimerSeconds(0);
    clearInterval(liveIntervalRef.current);
    liveIntervalRef.current = setInterval(() => {
      setLiveTimerSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopLiveTimer = () => {
    clearInterval(liveIntervalRef.current);
    setLiveTimerSeconds(0);
  };

  const handleBindDriveItem = async (item: DriveItem) => {
    if (boundDriveFiles.some(f => f.id === item.id)) {
      const updated = boundDriveFiles.filter(f => f.id !== item.id);
      setBoundDriveFiles(updated);
      updateQ10SlotsFromBound(updated);
      showToast(`ℹ️ تم إلغاء ربط: ${item.name}`, 'info');
      return;
    }

    let itemToBind = { ...item };
    if (!item.isFolder && accessToken && !item.content) {
      try {
        const text = await fetchDriveFileText(accessToken, item.id, item.mimeType);
        if (text) {
          itemToBind.content = text;
        }
      } catch (err) {
        console.warn('Could not read drive file content:', err);
      }
    }

    const updated = [...boundDriveFiles, itemToBind];
    setBoundDriveFiles(updated);
    updateQ10SlotsFromBound(updated);
    showToast(`✅ تم ربط (${item.name}) وقراءة بياناته لسياق الذكاء الاصطناعي!`);
  };

  const handleUnbindDriveItem = (id: string) => {
    const updated = boundDriveFiles.filter(f => f.id !== id);
    setBoundDriveFiles(updated);
    updateQ10SlotsFromBound(updated);
  };

  const updateQ10SlotsFromBound = (items: DriveItem[]) => {
    const map: Record<string, boolean> = {
      Q1: false, Q2: false, Q3: false, Q4: false, Q5: false,
      Q6: false, Q7: false, Q8: false, Q9: false, Q10: false,
    };
    items.forEach(item => {
      if (item.slot && map.hasOwnProperty(item.slot)) {
        map[item.slot] = true;
      }
    });
    setQ10Status(map);
  };

  const handleEndSession = async () => {
    globalAudioEngine.stopAllPlayback();
    if (isRecording) {
      stopRecordingAndTranscribe();
      stopLiveWebSocket();
    }
    if (user && turns.length > 0) {
      await persistSessionToCloud(false, 'COMPLETED');
      showToast('🛑 تم إنهاء الجلسة وحفظها بنجاح في Firestore!');
    } else {
      showToast('🛑 تم إنهاء الجلسة وإيقاف المايك والصوت.', 'info');
    }
  };

  const getCurrentSessionPayload = (): ExportSessionPayload => {
    const activePersona = personas[activePersonaId] || personas.sheikh_gemini;
    return {
      sessionId: currentSessionId,
      title: sessionTitle,
      versionTag: sessionVersionTag,
      createdAt: sessionCreatedAt,
      updatedAt: new Date().toISOString(),
      personaTitle: activePersona.title,
      personaDomain: activePersona.domain,
      llmModel: preferredModel,
      voiceName,
      voiceState,
      strictMonad,
      tokenSummary: {
        totalPrompt: telemetry.sessionPromptTokens,
        totalOutput: telemetry.sessionCandidateTokens,
        totalThinking: telemetry.sessionThinkingTokens,
      },
      boundDriveFiles: boundDriveFiles.map(b => ({
        id: b.id,
        name: b.name,
        mimeType: b.mimeType,
        slot: b.slot,
      })),
      turns,
    };
  };

  const handleOpenExportCurrent = () => {
    if (turns.length === 0) {
      showToast('⚠️ لا توجد رسائل مسجلة في الجلسة الحالية بعد لتصديرها.', 'warning');
      return;
    }
    setSessionToExport(getCurrentSessionPayload());
    setIsExportModalOpen(true);
  };

  const handleOpenExportSavedSession = (saved: SavedSession) => {
    const payload: ExportSessionPayload = {
      sessionId: saved.sessionId,
      title: saved.title,
      versionTag: saved.versionTag,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      llmModel: saved.llmModel,
      voiceName: saved.voiceName,
      voiceState: saved.voiceState,
      tokenSummary: saved.tokenSummary,
      boundDriveFiles: saved.boundDriveFiles,
      turns: saved.turns || [],
    };
    setSessionToExport(payload);
    setIsExportModalOpen(true);
  };

  const handleQuickExport = (format: 'json' | 'txt' = 'json') => {
    if (turns.length === 0) {
      showToast('⚠️ لا توجد رسائل لتصديرها في الجلسة الحالية.', 'warning');
      return;
    }
    const payload = getCurrentSessionPayload();
    const content = format === 'json' ? generateSessionJson(payload) : generateSessionText(payload);
    const filename = buildExportFilename(payload.title, payload.versionTag, format);
    const mime = format === 'json' ? 'application/json' : 'text/plain';
    const success = downloadFileLocally(content, filename, mime);
    if (success) {
      showToast(`💾 تم تنزيل سجل الجلسة (${filename}) محلياً بنجاح!`, 'success');
    } else {
      showToast('تعذر التنزيل المباشر، جاري فتح نافذة التصدير.', 'info');
      setSessionToExport(payload);
      setIsExportModalOpen(true);
    }
  };

  const handleResumeSession = (session: SavedSession) => {
    setSessionTitle(session.title);
    setCurrentSessionId(`sess_${Date.now()}`);
    const existingTags = savedSessionsList.map(s => s.versionTag);
    const nextVer = getNextVersionTag(existingTags);
    setSessionVersionTag(nextVer);
    setTurns(session.turns || []);
    setPreferredModel(session.llmModel || 'gemini-4-argon');
    setVoiceName(session.voiceName || 'Sadaltager');
    setVoiceState(session.voiceState || 'raayeq_ameeq');
    showToast(`📂 تم استدعاء (${session.title} [${session.versionTag}]) في الشات بترميز لاحق (${nextVer})!`);
  };

  const handleInjectSessionMemory = (session: SavedSession) => {
    if (injectedSessionIds.has(session.sessionId)) {
      setInjectedSessionIds(prev => {
        const next = new Set(prev);
        next.delete(session.sessionId);
        return next;
      });
      showToast(`ℹ️ تم إزالة (${session.title}) من الذاكرة الحية`, 'info');
      return;
    }

    setInjectedSessionIds(prev => new Set(prev).add(session.sessionId));
    const digest = `=== سجل مسترجع من السحابة: ${session.title} (${session.versionTag}) ===\n` +
      session.turns.slice(-10).map(t => `- المستخدم: ${t.userInput}\n- رد النموذج: ${t.modelOutput.slice(0, 300)}...`).join('\n');
    setInjectedMemoryBlocks(prev => [...prev, digest]);
    showToast(`🧠 تم حقن جلسة (${session.title} [${session.versionTag}]) كذاكرة حية!`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await deleteUserSession(user.uid, sessionId);
      setSavedSessionsList(prev => prev.filter(s => s.sessionId !== sessionId));
      showToast('تم حذف الجلسة من السحابة.', 'info');
    } catch (e: any) {
      showToast(`فشل حذف الجلسة: ${e.message}`, 'error');
    }
  };

  const handleRunModelProbe = async () => {
    const res = await fetch(`/api/gemini/model-info?model=${preferredModel}`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setTelemetry(prev => ({
      ...prev,
      serverVerifiedInputLimit: parseInt(data.inputTokenLimit || '1048576', 10),
      serverVerifiedOutputLimit: parseInt(data.outputTokenLimit || '65536', 10),
      serverVerifiedModelTitle: data.displayName || preferredModel,
    }));
    return data;
  };

  const handleRunCountTokensProbe = async () => {
    const sysPrompt = buildCompiledSystemInstruction();
    const contents: any[] = [{ role: 'user', parts: [{ text: sysPrompt }] }];
    turns.slice(-10).forEach(t => {
      contents.push({ role: 'user', parts: [{ text: t.userInput }] });
      contents.push({ role: 'model', parts: [{ text: t.modelOutput }] });
    });

    const res = await fetch('/api/gemini/countTokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: preferredModel, contents }),
    });

    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const exactTokens = parseInt(data.totalTokens || '0', 10);
    setTelemetry(prev => ({
      ...prev,
      tokenSource: 'server_count_tokens',
      lastPromptTokens: exactTokens,
    }));
    return data;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-2 md:p-4 select-none relative font-sans flex flex-col justify-between pb-16 lg:pb-4">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs md:text-sm border backdrop-blur-xl transition-all duration-300 flex items-center gap-2.5 ${
            toastType === 'success'
              ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
              : toastType === 'warning'
              ? 'bg-amber-950/95 border-amber-400 text-amber-200'
              : toastType === 'error'
              ? 'bg-rose-950/95 border-rose-400 text-rose-200'
              : 'bg-indigo-950/95 border-indigo-400 text-indigo-200'
          }`}
        >
          <span>{toastType === 'success' ? '✅' : toastType === 'warning' ? '⚠️' : toastType === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full space-y-3">
        {/* Header */}
        <Header
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isLoggingIn={isLoggingIn}
          onOpenRecallModal={() => setIsRecallModalOpen(true)}
          onEndSession={handleEndSession}
          onOpenExportModal={handleOpenExportCurrent}
          onOpenDriveModal={() => setIsDriveModalOpen(true)}
          onOpenQuotaModal={() => setIsQuotaModalOpen(true)}
          onTogglePersonaDrawer={() => setIsPersonaDrawerOpen(!isPersonaDrawerOpen)}
          onOpenDeviceAccessModal={() => setIsDeviceModalOpen(true)}
          speakerState={speakerState}
          speakerLabel={speakerLabel}
        />

        {/* Collapsible Telemetry & Settings Toggle for Desktop */}
        <div className="hidden lg:flex items-center justify-between px-2 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-bold text-cyan-300">لوحة الإعدادات والكوتا السريعة</span>
            <span className="text-[10px] text-slate-500 font-mono">({preferredModel} • {voiceName})</span>
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="text-[11px] text-blue-300 hover:text-blue-200 bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-500/40 font-bold flex items-center gap-1 transition"
              title="عرض رمز QR وروابط التثبيت على iPhone و Android و Windows"
            >
              <span>📱 فتح على الهاتف واللابتوب (QR)</span>
            </button>
          </div>
          <button
            onClick={() => setShowDesktopSettings(!showDesktopSettings)}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-bold"
          >
            {showDesktopSettings ? '▲ إخفاء شريط الإعدادات' : '▼ إظهار شريط الإعدادات والكوتا'}
          </button>
        </div>

        {/* Desktop Top Sections (Collapsible) */}
        {showDesktopSettings && (
          <div className="hidden lg:block space-y-3">
            <CloudSyncSettingsCard
              autoCloudSync={autoCloudSync}
              onToggleAutoCloudSync={handleToggleAutoCloudSync}
              onManualSync={() => {
                if (!user) {
                  showToast('يرجى تسجيل الدخول بحساب Google أولاً', 'warning');
                  return;
                }
                persistSessionToCloud(false, 'ACTIVE');
                showToast('☁️ تم حفظ ومزامنة الجلسة الحالية في Firestore بنجاح!');
              }}
              isLoggedIn={Boolean(user)}
              turnsCount={turns.length}
            />

            <QuotaTelemetryBar
              telemetry={telemetry}
              quotaTier={quotaTier}
              onChangeQuotaTier={setQuotaTier}
              onOpenInspector={() => setIsQuotaModalOpen(true)}
              currentContextTokens={estimateTokens(buildCompiledSystemInstruction())}
              thinkingBudget={thinkingBudget}
            />

            <ControlRibbon
              personas={personas}
              activePersonaId={activePersonaId}
              onChangePersona={setActivePersonaId}
              onOpenNewPersonaForm={() => setIsPersonaDrawerOpen(true)}
              engineMode={engineMode}
              onChangeEngineMode={setEngineMode}
              preferredModel={preferredModel}
              onChangePreferredModel={setPreferredModel}
              thinkingLevel={thinkingLevel}
              onChangeThinkingLevel={setThinkingLevel}
              voiceName={voiceName}
              onChangeVoiceName={setVoiceName}
              voiceState={voiceState}
              onChangeVoiceState={setVoiceState}
              onTestVoiceTone={handleTestVoiceTone}
              isTestingVoice={isTestingVoice}
            />

            <VoiceBioCard
              voiceName={voiceName}
              voiceState={voiceState}
              audioInputDevices={audioInputDevices}
              audioOutputDevices={audioOutputDevices}
              selectedInputId={selectedInputId}
              selectedOutputId={selectedOutputId}
              onChangeInputDevice={setSelectedInputId}
              onChangeOutputDevice={id => {
                setSelectedOutputId(id);
                globalAudioEngine.setOutputDevice(id);
              }}
              onRefreshDevices={refreshHardwareDevices}
              onPlayTestTone={() => globalAudioEngine.playTestTone()}
              volume={volume}
              onChangeVolume={v => {
                setVolume(v);
                globalAudioEngine.setVolume(v);
              }}
              speakerState={speakerState}
            />
          </div>
        )}

        {/* Mobile View Tabbed Switcher (Visible on screens < 1024px) */}
        <div className="lg:hidden flex items-center justify-between bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold text-center gap-1">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-2 px-1 rounded-xl transition ${
              mobileTab === 'chat'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 الشات
          </button>
          <button
            onClick={() => setMobileTab('voice')}
            className={`flex-1 py-2 px-1 rounded-xl transition ${
              mobileTab === 'voice'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🎙️ الصوت & Live
          </button>
          <button
            onClick={() => setMobileTab('drive')}
            className={`flex-1 py-2 px-1 rounded-xl transition ${
              mobileTab === 'drive'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Drive (Q1..Q10)
          </button>
          <button
            onClick={() => setMobileTab('settings')}
            className={`flex-1 py-2 px-1 rounded-xl transition ${
              mobileTab === 'settings'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ الكوتا والضبط
          </button>
        </div>

        {/* Mobile Quick Device Access Banner */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span>📱</span>
            <span>تثبيت كـ PWA على iPhone و Android</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDeviceModalOpen(true)}
            className="text-cyan-400 hover:text-cyan-300 font-bold underline"
          >
            عرض الـ QR ودليل التثبيت ↗
          </button>
        </div>

        {/* Mobile Tab Contents */}
        <div className="lg:hidden">
          {mobileTab === 'voice' && (
            <VoiceControlConsole
              isRecording={isRecording}
              isMuted={isMuted}
              onToggleMic={handleToggleMic}
              onToggleMute={handleToggleMute}
              liveTimerSeconds={liveTimerSeconds}
              engineMode={engineMode}
              isDictating={isDictating}
              onToggleDictation={handleToggleDictation}
              autoSendDictation={autoSendDictation}
              onToggleAutoSendDictation={setAutoSendDictation}
              autoSpeakReply={autoSpeakReply}
              onToggleAutoSpeakReply={setAutoSpeakReply}
              audioMeterLevel={audioMeterLevel}
              onStopAudioPlayback={() => globalAudioEngine.stopAllPlayback()}
              onNewSessionVersion={() => {
                setTurns([]);
                const existingTags = savedSessionsList.map(s => s.versionTag);
                const nextVer = getNextVersionTag(existingTags);
                setSessionVersionTag(nextVer);
                setCurrentSessionId(`sess_${Date.now()}`);
                showToast(`➕ تم فتح جلسة جديدة (${nextVer})!`);
              }}
              onOpenExportModal={handleOpenExportCurrent}
              q10Status={q10Status}
              boundDriveFiles={boundDriveFiles}
              onUnbindDriveItem={handleUnbindDriveItem}
              onOpenDriveModal={() => setIsDriveModalOpen(true)}
              isLiveVoiceActive={isLiveVoiceActive}
              onToggleLiveVoice={handleToggleLiveVoice}
              isTranscribingAudio={isTranscribingAudio}
              onToggleTranscribeMic={handleToggleTranscribeMic}
              onUploadAudioFile={handleTranscribeAudioFile}
              isTranscribingFile={isTranscribingFile}
            />
          )}

          {mobileTab === 'drive' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">🏛️ مصفوفة ملفات القرآن (Q1..Q10)</span>
                  <span className="text-xs text-amber-200 font-mono">
                    {Object.values(q10Status).filter(Boolean).length} / 10 Linked
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs">
                  {Array.from({ length: 10 }, (_, i) => {
                    const slot = `Q${i + 1}`;
                    const isLinked = Boolean(q10Status[slot]);
                    return (
                      <div
                        key={slot}
                        className={`p-2 rounded-xl font-bold ${
                          isLinked
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border border-slate-800 text-slate-500'
                        }`}
                      >
                        {isLinked ? `🟢 ${slot}` : `⚪ ${slot}`}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setIsDriveModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs shadow"
                >
                  ⚡ فتح مستكشف Google Drive لربط الملفات والمجلدات
                </button>
              </div>

              {boundDriveFiles.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-cyan-300">الملفات المرتبطة:</span>
                  {boundDriveFiles.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-200"
                    >
                      <span className="truncate">{b.name}</span>
                      <button onClick={() => handleUnbindDriveItem(b.id)} className="text-rose-400 font-bold px-2">
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mobileTab === 'settings' && (
            <div className="space-y-3">
              <CloudSyncSettingsCard
                autoCloudSync={autoCloudSync}
                onToggleAutoCloudSync={handleToggleAutoCloudSync}
                onManualSync={() => {
                  if (!user) {
                    showToast('يرجى تسجيل الدخول بحساب Google أولاً', 'warning');
                    return;
                  }
                  persistSessionToCloud(false, 'ACTIVE');
                  showToast('☁️ تم حفظ ومزامنة الجلسة الحالية في Firestore بنجاح!');
                }}
                isLoggedIn={Boolean(user)}
                turnsCount={turns.length}
              />

              {/* Multi-Device Installation Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/60 to-purple-950/50 border border-blue-500/40 flex items-center justify-between gap-3 shadow-lg">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                    <span>📱</span>
                    <span>تثبيت وتشغيل التطبيق على كافة الأجهزة</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    دليل شامل لـ iPhone (Safari) و Android (Chrome) واللابتوب مع رمز QR للمسح الفوري.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shrink-0 transition"
                >
                  فتح الدليل ↗
                </button>
              </div>

              <QuotaTelemetryBar
                telemetry={telemetry}
                quotaTier={quotaTier}
                onChangeQuotaTier={setQuotaTier}
                onOpenInspector={() => setIsQuotaModalOpen(true)}
                currentContextTokens={estimateTokens(buildCompiledSystemInstruction())}
                thinkingBudget={thinkingBudget}
              />
              <ControlRibbon
                personas={personas}
                activePersonaId={activePersonaId}
                onChangePersona={setActivePersonaId}
                onOpenNewPersonaForm={() => setIsPersonaDrawerOpen(true)}
                engineMode={engineMode}
                onChangeEngineMode={setEngineMode}
                preferredModel={preferredModel}
                onChangePreferredModel={setPreferredModel}
                thinkingLevel={thinkingLevel}
                onChangeThinkingLevel={setThinkingLevel}
                voiceName={voiceName}
                onChangeVoiceName={setVoiceName}
                voiceState={voiceState}
                onChangeVoiceState={setVoiceState}
                onTestVoiceTone={handleTestVoiceTone}
                isTestingVoice={isTestingVoice}
              />
              <VoiceBioCard
                voiceName={voiceName}
                voiceState={voiceState}
                audioInputDevices={audioInputDevices}
                audioOutputDevices={audioOutputDevices}
                selectedInputId={selectedInputId}
                selectedOutputId={selectedOutputId}
                onChangeInputDevice={setSelectedInputId}
                onChangeOutputDevice={id => {
                  setSelectedOutputId(id);
                  globalAudioEngine.setOutputDevice(id);
                }}
                onRefreshDevices={refreshHardwareDevices}
                onPlayTestTone={() => globalAudioEngine.playTestTone()}
                volume={volume}
                onChangeVolume={v => {
                  setVolume(v);
                  globalAudioEngine.setVolume(v);
                }}
                speakerState={speakerState}
              />
            </div>
          )}
        </div>

        {/* Persona Drawer (Collapsible) */}
        <PersonaDrawer
          isOpen={isPersonaDrawerOpen}
          onClose={() => setIsPersonaDrawerOpen(false)}
          personas={personas}
          activePersona={personas[activePersonaId] || personas.sheikh_gemini}
          onSelectPersona={setActivePersonaId}
          onSavePersona={async p => {
            setPersonas(prev => ({ ...prev, [p.id]: p }));
            setActivePersonaId(p.id);
            if (user) {
              await saveUserCustomPersona(user.uid, {
                personaId: p.id,
                userId: user.uid,
                title: p.title,
                userName: p.userName,
                domain: p.domain,
                systemInstruction: p.system,
                memoryBank: p.memory,
                conversationRules: p.rules,
                strictMonad: p.strictMonad,
                createdAt: new Date().toISOString(),
              });
            }
            showToast(`✅ تم حفظ وتفعيل البيرسونا (${p.title})!`);
          }}
          onDeleteCustomPersona={async id => {
            if (user) {
              await deleteUserCustomPersona(user.uid, id);
            }
            setPersonas(prev => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
            setActivePersonaId('sheikh_gemini');
            showToast('تم حذف البيرسونا بنجاح.', 'info');
          }}
          onResetToMonadDefault={() => {
            setActivePersonaId('sheikh_gemini');
            setStrictMonad(true);
            showToast('🔄 تم استرجاع نصوص MONAD Sovereign Kernel v6.2 الأصلية!');
          }}
          strictMonad={strictMonad}
          onToggleStrictMonad={setStrictMonad}
          onSaveToCloud={() => {
            persistSessionToCloud(false, 'ACTIVE');
            showToast('💾 تم حفظ التعديلات وإعدادات الجلسة في السحابة!');
          }}
        />

        {/* Main Desktop Workspace (Split View) / Mobile Chat Workspace */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-3.5 ${mobileTab !== 'chat' ? 'hidden lg:grid' : ''}`}>
          {/* Left Column (Desktop Only): Voice Console & Q10 Matrix */}
          <div className="hidden lg:block lg:col-span-4">
            <VoiceControlConsole
              isRecording={isRecording}
              isMuted={isMuted}
              onToggleMic={handleToggleMic}
              onToggleMute={handleToggleMute}
              liveTimerSeconds={liveTimerSeconds}
              engineMode={engineMode}
              isDictating={isDictating}
              onToggleDictation={handleToggleDictation}
              autoSendDictation={autoSendDictation}
              onToggleAutoSendDictation={setAutoSendDictation}
              autoSpeakReply={autoSpeakReply}
              onToggleAutoSpeakReply={setAutoSpeakReply}
              audioMeterLevel={audioMeterLevel}
              onStopAudioPlayback={() => globalAudioEngine.stopAllPlayback()}
              onNewSessionVersion={() => {
                setTurns([]);
                const existingTags = savedSessionsList.map(s => s.versionTag);
                const nextVer = getNextVersionTag(existingTags);
                setSessionVersionTag(nextVer);
                setCurrentSessionId(`sess_${Date.now()}`);
                showToast(`➕ تم فتح جلسة جديدة بترميز لاحق (${nextVer})!`);
              }}
              onOpenExportModal={handleOpenExportCurrent}
              q10Status={q10Status}
              boundDriveFiles={boundDriveFiles}
              onUnbindDriveItem={handleUnbindDriveItem}
              onOpenDriveModal={() => setIsDriveModalOpen(true)}
              isLiveVoiceActive={isLiveVoiceActive}
              onToggleLiveVoice={handleToggleLiveVoice}
              isTranscribingAudio={isTranscribingAudio}
              onToggleTranscribeMic={handleToggleTranscribeMic}
              onUploadAudioFile={handleTranscribeAudioFile}
              isTranscribingFile={isTranscribingFile}
            />
          </div>

          {/* Right Column: Live Captions & Conversation Stream */}
          <div className="col-span-1 lg:col-span-8 rounded-2xl p-3 md:p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 flex flex-col h-[520px] sm:h-[560px] lg:h-[600px] shadow-2xl">
            {/* Active Session & Local Export Toolbar */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800 text-xs flex-wrap shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">💬</span>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  className="bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 focus:border-cyan-500 text-slate-200 font-bold text-xs max-w-[190px] sm:max-w-[240px] truncate focus:outline-none"
                  title="اضغط لتعديل اسم الجلسة قبل التصدير أو الحفظ"
                  placeholder="عنوان الجلسة..."
                />
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono font-bold">
                  {sessionVersionTag}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                  {turns.length} أدوار
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenExportCurrent}
                  className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600/40 via-teal-600/40 to-cyan-600/40 hover:from-emerald-600/60 hover:to-cyan-600/60 border border-emerald-400/50 text-emerald-200 text-xs font-bold transition flex items-center gap-1 shadow"
                  title="تصدير سجل المحادثة كملف JSON أو نصي TXT أو Markdown محلياً خارج Firestore"
                >
                  <span>💾 تصدير محلي</span>
                </button>

                <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuickExport('json')}
                    disabled={turns.length === 0}
                    className="px-2 py-0.5 rounded text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="تنزيل مباشر بصيغة JSON"
                  >
                    .json
                  </button>
                  <span className="text-slate-700 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={() => handleQuickExport('txt')}
                    disabled={turns.length === 0}
                    className="px-2 py-0.5 rounded text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="تنزيل مباشر بصيغة TXT"
                  >
                    .txt
                  </button>
                </div>
              </div>
            </div>

            {/* Live Captions Stage */}
            <LiveCaptionsStage
              userTranscript={userTranscript}
              modelTranscript={modelTranscript}
              isInterimUser={isInterimUser}
              voiceName={voiceName}
              voiceStateShort={VOCAL_STATES_CATALOG[voiceState]?.short || 'الرايق العميق'}
              activeVoiceMode={activeVoiceMode}
              onClearCaptions={() => {
                setUserTranscript('');
                setModelTranscript('');
              }}
              onReplayModelAudio={speakText}
            />

            {/* Chat Stream */}
            <ChatStream
              turns={turns}
              isGenerating={isGenerating}
              onReplayTTS={speakText}
              showThinkingTrace={true}
            />

            {/* Prompt Input Bar */}
            <PromptInputBar
              inputPrompt={inputPrompt}
              setInputPrompt={setInputPrompt}
              onSend={handleSendPrompt}
              isGenerating={isGenerating}
              onMicClick={handleToggleMic}
              isRecording={isRecording}
              isLiveVoiceActive={isLiveVoiceActive}
              onToggleLiveVoice={handleToggleLiveVoice}
              isTranscribingAudio={isTranscribingAudio}
              onToggleTranscribeMic={handleToggleTranscribeMic}
              onUploadAudioFile={handleTranscribeAudioFile}
              isTranscribingFile={isTranscribingFile}
              isDictating={isDictating}
              onToggleDictation={handleToggleDictation}
              liveTimerSeconds={liveTimerSeconds}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <DriveExplorerModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        accessToken={accessToken}
        onBindItem={handleBindDriveItem}
        boundItemIds={new Set(boundDriveFiles.map(b => b.id))}
      />

      <QuotaInspectorModal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        telemetry={telemetry}
        activeModel={preferredModel}
        onRunServerProbe={handleRunModelProbe}
        onRunCountTokensProbe={handleRunCountTokensProbe}
        customRpm={customRpm}
        customTpm={customTpm}
        customRpd={customRpd}
        onSaveCustomLimits={(r, t, d) => {
          setCustomRpm(r);
          setCustomTpm(t);
          setCustomRpd(d);
          showToast('✅ تم حفظ وتطبيق حدود الكوتا المخصصة!');
        }}
      />

      <RecallSessionModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        sessions={savedSessionsList}
        onResumeSession={handleResumeSession}
        onInjectMemory={handleInjectSessionMemory}
        onDeleteSession={handleDeleteSession}
        onExportSession={handleOpenExportSavedSession}
        injectedSessionIds={injectedSessionIds}
      />

      <ExportSessionModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessionData={sessionToExport}
        onNotify={(msg, type) => showToast(msg, type)}
        accessToken={accessToken}
      />

      <DeviceAccessModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />
    </div>
  );
}
