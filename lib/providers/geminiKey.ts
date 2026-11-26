let rejectedKeySnapshot: string | null = null;

/**
 * Returns a plausible Gemini API key from the server environment, or null
 * when unset, clearly a placeholder, or previously rejected by the upstream API.
 */
export function getUsableGeminiApiKey(): string | null {
  const raw = (process.env.GEMINI_API_KEY || '').trim();
  if (!raw || raw.length < 20) {
    return null;
  }

  if (rejectedKeySnapshot && raw === rejectedKeySnapshot) {
    return null;
  }

  if (
    /^(my_|your_|replace|placeholder|dummy|fake|test|sample|changeme|xxx|gemini_api_key)/i.test(
      raw
    )
  ) {
    return null;
  }

  return raw;
}

/**
 * Records invalid/unauthorized key failures so subsequent requests transition
 * directly to the deterministic edge fallback without emitting noisy RPC errors.
 */
export function markGeminiFailure(apiKey: string, err: unknown): void {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : JSON.stringify(err || '');

  if (/API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg)) {
    rejectedKeySnapshot = apiKey;
  }
}
