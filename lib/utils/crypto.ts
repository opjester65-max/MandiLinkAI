/**
 * Universal Isomorphic Cryptographic Utilities for MandiLink
 * Works seamlessly in both Vite client bundles (browser) and Node.js environments.
 * Uses @noble/hashes and standard Web Crypto API.
 * Never imports Node built-in "crypto" to prevent Vite browser-compatibility externalization crashes.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from '@noble/hashes/utils.js';

export { bytesToHex, hexToBytes, utf8ToBytes, concatBytes };

export function sha256Bytes(data: string | Uint8Array): Uint8Array {
  const inputBytes = typeof data === 'string' ? utf8ToBytes(data) : data;
  return sha256(inputBytes);
}

export function sha256Hex(data: string | Uint8Array): string {
  return bytesToHex(sha256Bytes(data));
}

export function randomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

export function randomHex(byteLength: number): string {
  return bytesToHex(randomBytes(byteLength));
}

export function randomUUID(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    try {
      return globalThis.crypto.randomUUID();
    } catch (_e) {
      // Fallback below
    }
  }
  // RFC 4122 version 4 UUID generator
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
  const hex = bytesToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
