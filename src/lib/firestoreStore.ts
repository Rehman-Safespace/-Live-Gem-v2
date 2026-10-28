/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';
import { DriveItem } from './drive';

export interface SavedTurn {
  turnIndex: number;
  timestamp: string;
  inputModality: string;
  userInput: string;
  thinkingTrace?: string;
  modelOutput: string;
  modelUsed: string;
  voiceNameUsed?: string;
  voiceStateUsed?: string;
  tokensUsed?: {
    prompt: number;
    output: number;
    thinking?: number;
    officialServerCount?: boolean;
  };
}

export interface SavedSession {
  sessionId: string;
  userId: string;
  title: string;
  titleSlug: string;
  versionTag: string;
  sessionStatus: 'ACTIVE' | 'SAVED' | 'COMPLETED';
  llmModel: string;
  voiceName: string;
  voiceState: string;
  turnCount: number;
  turns: SavedTurn[];
  tokenSummary?: {
    totalPrompt: number;
    totalOutput: number;
    totalThinking: number;
  };
  boundDriveFiles?: Array<{
    id: string;
    name: string;
    mimeType: string;
    slot?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface StoredPersona {
  personaId: string;
  userId: string;
  title: string;
  userName: string;
  domain: string;
  systemInstruction: string;
  memoryBank: string;
  conversationRules: string;
  strictMonad: boolean;
  createdAt: string;
}

export async function saveUserSession(userId: string, session: SavedSession): Promise<void> {
  const path = `users/${userId}/sessions/${session.sessionId}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.sessionId);
    await setDoc(sessionRef, session, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchUserSessions(userId: string): Promise<SavedSession[]> {
  const path = `users/${userId}/sessions`;
  try {
    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as SavedSession);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteUserSession(userId: string, sessionId: string): Promise<void> {
  const path = `users/${userId}/sessions/${sessionId}`;
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveUserCustomPersona(userId: string, persona: StoredPersona): Promise<void> {
  const path = `users/${userId}/personas/${persona.personaId}`;
  try {
    const personaRef = doc(db, 'users', userId, 'personas', persona.personaId);
    await setDoc(personaRef, persona, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchUserCustomPersonas(userId: string): Promise<StoredPersona[]> {
  const path = `users/${userId}/personas`;
  try {
    const personasRef = collection(db, 'users', userId, 'personas');
    const snapshot = await getDocs(personasRef);
    return snapshot.docs.map(d => d.data() as StoredPersona);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteUserCustomPersona(userId: string, personaId: string): Promise<void> {
  const path = `users/${userId}/personas/${personaId}`;
  try {
    const personaRef = doc(db, 'users', userId, 'personas', personaId);
    await deleteDoc(personaRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveUserDriveBinds(userId: string, items: DriveItem[]): Promise<void> {
  const path = `users/${userId}/driveBinds`;
  try {
    for (const item of items) {
      const bindRef = doc(db, 'users', userId, 'driveBinds', item.id);
      await setDoc(bindRef, {
        bindId: item.id,
        userId,
        fileId: item.id,
        name: item.name,
        mimeType: item.mimeType,
        isFolder: item.isFolder,
        slot: item.slot || null,
        sizeMb: item.sizeMb || 0,
        boundAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchUserDriveBinds(userId: string): Promise<DriveItem[]> {
  const path = `users/${userId}/driveBinds`;
  try {
    const bindsRef = collection(db, 'users', userId, 'driveBinds');
    const snapshot = await getDocs(bindsRef);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: data.fileId || data.bindId,
        name: data.name,
        mimeType: data.mimeType,
        isFolder: data.isFolder,
        slot: data.slot,
        sizeMb: data.sizeMb
      } as DriveItem;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
