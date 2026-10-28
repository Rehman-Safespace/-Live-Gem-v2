/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuotaTierConfig {
  label: string;
  rpmLimit: number;
  tpmLimit: number;
  rpdLimit: number;
  ctxLimit: number;
  outLimit: number;
}

export const QUOTA_TIERS: Record<string, QuotaTierConfig> = {
  paid_tier_1: {
    label: '💎 Paid Tier 1 (1,000 RPM | 4M TPM | 10,000 RPD)',
    rpmLimit: 1000,
    tpmLimit: 4000000,
    rpdLimit: 10000,
    ctxLimit: 1048576,
    outLimit: 65536,
  },
  paid_tier_2: {
    label: '🚀 Paid Tier 2 (2,000 RPM | 10M TPM | 50,000 RPD)',
    rpmLimit: 2000,
    tpmLimit: 10000000,
    rpdLimit: 50000,
    ctxLimit: 1048576,
    outLimit: 65536,
  },
  free_tier: {
    label: '🆓 Free Tier (15 RPM | 1M TPM | 1,500 RPD)',
    rpmLimit: 15,
    tpmLimit: 1000000,
    rpdLimit: 1500,
    ctxLimit: 1048576,
    outLimit: 65536,
  },
};

export interface QuotaTelemetryState {
  tokenSource: 'heuristic_local' | 'server_usage_metadata' | 'server_count_tokens';
  serverVerifiedInputLimit: number;
  serverVerifiedOutputLimit: number;
  serverVerifiedModelTitle: string;
  lastPromptTokens: number;
  lastCandidateTokens: number;
  lastThinkingTokens: number;
  lastTotalTokens: number;
  sessionPromptTokens: number;
  sessionCandidateTokens: number;
  sessionThinkingTokens: number;
  sessionTotalTokens: number;
  dailyRequestsUsed: number;
  minuteRequestsLog: number[];
  minuteTokensLog: Array<{ ts: number; tokens: number }>;
}

export function createInitialTelemetryState(): QuotaTelemetryState {
  return {
    tokenSource: 'heuristic_local',
    serverVerifiedInputLimit: 1048576,
    serverVerifiedOutputLimit: 65536,
    serverVerifiedModelTitle: 'gemini-3.8-flash',
    lastPromptTokens: 0,
    lastCandidateTokens: 0,
    lastThinkingTokens: 0,
    lastTotalTokens: 0,
    sessionPromptTokens: 0,
    sessionCandidateTokens: 0,
    sessionThinkingTokens: 0,
    sessionTotalTokens: 0,
    dailyRequestsUsed: 0,
    minuteRequestsLog: [],
    minuteTokensLog: [],
  };
}

export function recordUsage(
  state: QuotaTelemetryState,
  promptTok: number,
  candidateTok: number,
  thinkingTok: number,
  isNewRequest: boolean = true,
  isOfficialServerMetadata: boolean = false
): QuotaTelemetryState {
  const now = Date.now();
  const totalTurn = (promptTok || 0) + (candidateTok || 0) + (thinkingTok || 0);

  const updatedLog = state.minuteRequestsLog.filter(ts => now - ts < 60000);
  const updatedTokensLog = state.minuteTokensLog.filter(item => now - item.ts < 60000);

  if (isNewRequest) {
    updatedLog.push(now);
  }
  if (totalTurn > 0) {
    updatedTokensLog.push({ ts: now, tokens: totalTurn });
  }

  return {
    ...state,
    tokenSource: isOfficialServerMetadata ? 'server_usage_metadata' : state.tokenSource,
    lastPromptTokens: promptTok,
    lastCandidateTokens: candidateTok,
    lastThinkingTokens: thinkingTok,
    lastTotalTokens: totalTurn,
    sessionPromptTokens: state.sessionPromptTokens + promptTok,
    sessionCandidateTokens: state.sessionCandidateTokens + candidateTok,
    sessionThinkingTokens: state.sessionThinkingTokens + thinkingTok,
    sessionTotalTokens: state.sessionTotalTokens + totalTurn,
    dailyRequestsUsed: state.dailyRequestsUsed + (isNewRequest ? 1 : 0),
    minuteRequestsLog: updatedLog,
    minuteTokensLog: updatedTokensLog,
  };
}
