/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live-ws' });

app.use(express.json({ limit: '64mb' }));
app.use(express.urlencoded({ extended: true, limit: '64mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Fallback sequences
const COMPLEX_CHAIN = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
const GENERAL_CHAIN = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
const FAST_CHAIN = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const TTS_CHAIN = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

// 1. Generate text / complex reasoning endpoint with model fallback
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const {
      prompt,
      messages = [],
      model = 'gemini-3.8-flash',
      systemInstruction,
      thinkingLevel,
      temperature = 0.7,
      stream = false,
    } = req.body;

    if (!prompt && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Prompt or messages are required' });
    }

    let candidateModels = [model];
    if (model === 'gemini-4-argon') {
      candidateModels = COMPLEX_CHAIN;
    } else if (model === 'gemini-3.1-flash-lite') {
      candidateModels = FAST_CHAIN;
    } else {
      candidateModels = GENERAL_CHAIN;
    }

    // Prepare contents
    const contents: any[] = [];
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }],
        });
      }
    }
    if (prompt) {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });
    }

    let lastError: any = null;
    let successfulModel = model;
    let finalResult: any = null;

    for (const targetModel of candidateModels) {
      try {
        const config: any = {
          temperature: Number(temperature),
        };
        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        // Configure Thinking Level
        // Rule: gemini-4-argon with thinkingLevel: ThinkingLevel.HIGH and no maxOutputTokens
        if (targetModel === 'gemini-4-argon') {
          config.thinkingConfig = {
            thinkingLevel: ThinkingLevel.HIGH,
          };
          // Do not set maxOutputTokens
        } else if (thinkingLevel && thinkingLevel !== 'NONE') {
          const tLevel =
            thinkingLevel === 'HIGH'
              ? ThinkingLevel.HIGH
              : thinkingLevel === 'MEDIUM'
              ? ThinkingLevel.MEDIUM
              : thinkingLevel === 'LOW'
              ? ThinkingLevel.LOW
              : ThinkingLevel.MINIMAL;
          config.thinkingConfig = { thinkingLevel: tLevel };
        }

        if (stream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          const responseStream = await ai.models.generateContentStream({
            model: targetModel,
            contents,
            config,
          });

          for await (const chunk of responseStream) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            let text = '';
            let thoughts = '';
            for (const p of parts) {
              if ((p as any).thought && p.text) {
                thoughts += p.text;
              } else if (p.text) {
                text += p.text;
              }
            }
            res.write(
              `data: ${JSON.stringify({
                text,
                thoughts,
                modelUsed: targetModel,
                usageMetadata: chunk.usageMetadata,
              })}\n\n`
            );
          }
          res.write('data: [DONE]\n\n');
          return res.end();
        }

        const response = await ai.models.generateContent({
          model: targetModel,
          contents,
          config,
        });

        successfulModel = targetModel;
        finalResult = response;
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${targetModel} failed: ${err.message}. Trying fallback...`);
      }
    }

    if (!finalResult) {
      throw lastError || new Error('All model attempts failed');
    }

    const candidate = finalResult.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let text = '';
    let thoughts = '';
    for (const p of parts) {
      if ((p as any).thought && p.text) {
        thoughts += p.text;
      } else if (p.text) {
        text += p.text;
      }
    }

    if (!text && finalResult.text) {
      text = finalResult.text;
    }

    res.json({
      text,
      thoughts,
      modelUsed: successfulModel,
      usageMetadata: finalResult.usageMetadata,
    });
  } catch (error: any) {
    console.error('API /api/gemini/generate error:', error);
    res.status(500).json({ error: error.message || 'Error generating content' });
  }
});

// 2. Text to Speech endpoint using gemini-3.8-flash-tts
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Sadaltager', style } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    let audioBase64: string | null = null;
    let modelUsed = 'gemini-3.8-flash-tts';
    let usageMetadata: any = null;

    for (const ttsModel of TTS_CHAIN) {
      try {
        const promptPart: any = { text };
        if (style) {
          promptPart.speechMetadata = { style };
        }

        const response = await ai.models.generateContent({
          model: ttsModel,
          contents: [
            {
              role: 'user',
              parts: [promptPart],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          modelUsed = ttsModel;
          usageMetadata = response.usageMetadata;
          break;
        }
      } catch (err: any) {
        console.warn(`TTS model ${ttsModel} failed: ${err.message}. Trying fallback...`);
      }
    }

    if (!audioBase64) {
      return res.status(500).json({ error: 'Could not generate speech audio' });
    }

    res.json({
      audioData: audioBase64,
      mimeType: 'audio/wav',
      modelUsed,
      usageMetadata,
    });
  } catch (error: any) {
    console.error('API /api/gemini/tts error:', error);
    res.status(500).json({ error: error.message || 'Error generating TTS audio' });
  }
});

// 3. Audio Transcription endpoint using gemini-3.5-transcribe
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm', prompt = 'Transcribe this speech accurately.' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'audioData base64 string is required' });
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioData,
      },
    };

    let transcription = '';
    let modelUsed = 'gemini-3.5-transcribe';
    let usageMetadata: any = null;

    const transcribeCandidates = ['gemini-3.5-transcribe', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const targetModel of transcribeCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: [
            audioPart,
            prompt || 'Transcribe this speech accurately. If Arabic, retain natural nuances.',
          ],
        });

        transcription = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        modelUsed = targetModel;
        usageMetadata = response.usageMetadata;
        break;
      } catch (err: any) {
        console.warn(`Transcribe model ${targetModel} failed: ${err.message}. Trying next fallback...`);
      }
    }

    res.json({
      transcription,
      modelUsed,
      usageMetadata,
    });
  } catch (error: any) {
    console.error('API /api/gemini/transcribe error:', error);
    res.status(500).json({ error: error.message || 'Error transcribing audio' });
  }
});

// 4. Exact Token Counter using Google's :countTokens API
app.post('/api/gemini/countTokens', async (req, res) => {
  try {
    const { model = 'gemini-3.8-flash', contents } = req.body;
    if (!contents) {
      return res.status(400).json({ error: 'contents is required' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens?key=${apiKey}`;
    const fetchResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!fetchResp.ok) {
      const errTxt = await fetchResp.text();
      return res.status(fetchResp.status).json({ error: errTxt });
    }

    const data = await fetchResp.json();
    res.json(data);
  } catch (error: any) {
    console.error('API /api/gemini/countTokens error:', error);
    res.status(500).json({ error: error.message || 'Error counting tokens' });
  }
});

// 5. Model limits inspector probe
app.get('/api/gemini/model-info', async (req, res) => {
  try {
    const model = (req.query.model as string) || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`;
    const fetchResp = await fetch(url);
    if (!fetchResp.ok) {
      const errTxt = await fetchResp.text();
      return res.status(fetchResp.status).json({ error: errTxt });
    }
    const data = await fetchResp.json();
    res.json(data);
  } catch (error: any) {
    console.error('API /api/gemini/model-info error:', error);
    res.status(500).json({ error: error.message || 'Error fetching model info' });
  }
});

// 6. WebSocket Live API bridge for gemini-3.8-live
wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Live WebSocket client connected');
  let liveSession: any = null;
  const liveModelChain = ['gemini-3.8-live', 'gemini-3.8-live-extended-thinking', 'gemini-3.5-flash-live-preview'];

  clientWs.on('message', async (raw: string) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'START_SESSION') {
        const {
          voiceName = 'Sadaltager',
          systemInstruction = 'You are a helpful assistant.',
          model = 'gemini-3.8-live',
        } = data;

        let connected = false;
        const modelsToTry = [model, ...liveModelChain.filter(m => m !== model)];

        for (const targetModel of modelsToTry) {
          try {
            liveSession = await ai.live.connect({
              model: targetModel,
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName } },
                },
                systemInstruction,
                outputAudioTranscription: {},
                inputAudioTranscription: {},
              },
              callbacks: {
                onmessage: (message: any) => {
                  const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                  if (audio) {
                    clientWs.send(JSON.stringify({ type: 'AUDIO_CHUNK', audio }));
                  }
                  if (message.serverContent?.interrupted) {
                    clientWs.send(JSON.stringify({ type: 'INTERRUPTED' }));
                  }
                  if (message.serverContent?.outputTranscription?.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'OUTPUT_TRANSCRIPTION',
                        text: message.serverContent.outputTranscription.text,
                      })
                    );
                  }
                  if (message.serverContent?.inputTranscription?.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'INPUT_TRANSCRIPTION',
                        text: message.serverContent.inputTranscription.text,
                      })
                    );
                  }
                  if (message.serverContent?.turnComplete) {
                    clientWs.send(JSON.stringify({ type: 'TURN_COMPLETE' }));
                  }
                },
                onclose: () => {
                  clientWs.send(JSON.stringify({ type: 'SESSION_CLOSED' }));
                },
              },
            });

            connected = true;
            clientWs.send(JSON.stringify({ type: 'SESSION_READY', model: targetModel }));
            break;
          } catch (connErr: any) {
            console.warn(`Live connect failed on ${targetModel}: ${connErr.message}`);
          }
        }

        if (!connected) {
          clientWs.send(
            JSON.stringify({
              type: 'ERROR',
              message: 'Failed to connect to Live API session across model fallbacks',
            })
          );
        }
      } else if (data.type === 'AUDIO_INPUT' && liveSession) {
        liveSession.sendRealtimeInput({
          audio: {
            data: data.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (data.type === 'TEXT_INPUT' && liveSession) {
        liveSession.sendRealtimeInput({
          text: data.text,
        });
      }
    } catch (msgErr: any) {
      console.error('Error handling WebSocket message:', msgErr);
    }
  });

  clientWs.on('close', () => {
    console.log('Live WebSocket client disconnected');
    if (liveSession && typeof liveSession.close === 'function') {
      try {
        liveSession.close();
      } catch (_) {}
    }
  });
});

// Mount Vite or static server
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

if (!isProd) {
  const vite = await (await import('vite')).createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
