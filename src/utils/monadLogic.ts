/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Classifies file names into Quran part slots (Q1..Q10), Ledger, or Middleware.
 */
export function classifyQuranPartSlot(filename: string): { slot: string | null; sortOrder: number } {
  if (!filename) return { slot: null, sortOrder: 99 };
  const lower = filename.toLowerCase();

  // Ledger and middleware take precedence over generic slot matches
  if (lower.includes('ledger') || lower.includes('immutable') || lower.includes('monad_core')) {
    return { slot: 'LEDGER', sortOrder: 11 };
  }
  if (lower.includes('middleware') || lower.includes('scenario')) {
    return { slot: 'MIDDLEWARE', sortOrder: 12 };
  }

  const match = lower.match(/(?:quran[_\-\s]*part|part|q|الجزء)[_\-\s]*0*(10|[1-9])(?![0-9])/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 10) {
      return { slot: `Q${num}`, sortOrder: num };
    }
  }

  return { slot: null, sortOrder: 99 };
}

/**
 * Heuristic estimation of tokens from text (chars / 3.2 for Arabic/mixed technical content).
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 3.2));
}

/**
 * Sanitizes a title for file naming and versioning.
 */
export function sanitizeTitleSlug(title: string): string {
  const raw = String(title || 'جلسة_الشيخ_جيمناي').trim();
  let slug = raw.replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, '_');
  slug = slug.replace(/_+/g, '_').replace(/^_|_$/g, '');
  return slug.slice(0, 65) || 'جلسة_الشيخ_جيمناي';
}

/**
 * Increments or creates next version tag (e.g. v001 -> v002).
 */
export function getNextVersionTag(existingTags: string[]): string {
  let maxVer = 0;
  for (const tag of existingTags) {
    const m = tag.match(/v(\d+)/i);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v > maxVer) maxVer = v;
    }
  }
  const nextVer = maxVer + 1;
  return `v${String(nextVer).padStart(3, '0')}`;
}

/**
 * Formats token count with M / K suffix.
 */
export function formatTokensNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(num);
}
