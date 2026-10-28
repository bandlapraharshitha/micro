/**
 * Frontend API Client for DAA Huffman Micro-Architecture Engine.
 *
 * Interfaces with the Python FastAPI backend.
 * Handles:
 * - Network unavailability / connection refused
 * - Invalid requests and validation errors
 * - Empty input guards
 * - Loading state hooks / listeners
 * - Strict delegation of Huffman algorithms to the Python backend (no JS reimplementation).
 */

const DEFAULT_API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8000');

export class DaaApiClient {
  /**
   * @param {string} [baseUrl=DEFAULT_API_BASE_URL]
   */
  constructor(baseUrl = DEFAULT_API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.isLoading = false;
    /** @type {Set<function(boolean): void>} */
    this.loadingListeners = new Set();
  }

  /**
   * Subscribes a listener to global API loading state changes.
   * @param {function(boolean): void} listener
   * @returns {function(): void} Unsubscribe function
   */
  onLoadingChange(listener) {
    this.loadingListeners.add(listener);
    return () => this.loadingListeners.delete(listener);
  }

  /**
   * Internal loading state dispatcher.
   * @param {boolean} loading
   * @private
   */
  _setLoading(loading) {
    this.isLoading = loading;
    for (const listener of this.loadingListeners) {
      try {
        listener(loading);
      } catch (err) {
        console.error('Error in API loading listener:', err);
      }
    }
  }

  /**
   * Universal fetch wrapper with error handling.
   * @param {string} endpoint
   * @param {RequestInit} [options={}]
   * @param {function(boolean): void} [localLoadingCallback]
   * @returns {Promise<{ success: boolean, data?: any, error?: string, status?: number, isNetworkError?: boolean }>}
   * @private
   */
  async _request(endpoint, options = {}, localLoadingCallback = null) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    this._setLoading(true);
    if (localLoadingCallback) localLoadingCallback(true);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        ...options,
      });

      let jsonBody = null;
      try {
        jsonBody = await response.json();
      } catch {
        jsonBody = null;
      }

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        if (jsonBody && jsonBody.detail) {
          if (typeof jsonBody.detail === 'string') {
            errorMsg = jsonBody.detail;
          } else if (Array.isArray(jsonBody.detail)) {
            // Pydantic validation errors
            errorMsg = jsonBody.detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
          }
        }
        return {
          success: false,
          error: errorMsg,
          status: response.status,
          data: jsonBody,
        };
      }

      return {
        success: true,
        data: jsonBody,
        status: response.status,
      };
    } catch (err) {
      const isConnectionRefused =
        err.message?.includes('fetch failed') ||
        err.message?.includes('NetworkError') ||
        err.name === 'TypeError';

      const errorMsg = isConnectionRefused
        ? `Backend service unavailable at ${this.baseUrl}. Please verify the Python FastAPI backend is running.`
        : err.message || 'Unknown network request error occurred.';

      return {
        success: false,
        error: errorMsg,
        isNetworkError: true,
        status: 0,
      };
    } finally {
      this._setLoading(false);
      if (localLoadingCallback) localLoadingCallback(false);
    }
  }

  /**
   * Probes backend health status.
   * GET /api/health
   */
  async checkHealth(options = {}) {
    return this._request('/api/health', { method: 'GET' }, options.onLoading);
  }

  /**
   * Retrieves curated micro-architecture assembly datasets.
   * GET /api/daa/sample
   */
  async getSampleData(options = {}) {
    return this._request('/api/daa/sample', { method: 'GET' }, options.onLoading);
  }

  /**
   * Computes symbol frequencies using the Python DAA algorithm.
   * POST /api/daa/frequencies
   *
   * @param {string|string[]} data - Input text string or list of instruction tokens
   * @param {Object} [options]
   */
  async calculateFrequencies(data, options = {}) {
    if (data === null || data === undefined) {
      return {
        success: false,
        error: 'Input data cannot be null or undefined.',
      };
    }

    return this._request(
      '/api/daa/frequencies',
      {
        method: 'POST',
        body: JSON.stringify({ data }),
      },
      options.onLoading
    );
  }

  /**
   * Executes greedy Huffman compression on the input via Python DAA backend.
   * POST /api/daa/compress
   *
   * @param {string|string[]} data - Input text or instruction sequence
   * @param {number} [bitsPerSymbol=8] - Uncompressed baseline word size
   * @param {Object} [options]
   */
  async compress(data, bitsPerSymbol = 8, options = {}) {
    if (data === null || data === undefined) {
      return {
        success: false,
        error: 'Input data cannot be null or undefined.',
      };
    }

    return this._request(
      '/api/daa/compress',
      {
        method: 'POST',
        body: JSON.stringify({
          data,
          bits_per_symbol: Number(bitsPerSymbol) || 8,
        }),
      },
      options.onLoading
    );
  }

  /**
   * Decodes a binary bitstream using the prefix codebook.
   * POST /api/daa/decompress
   *
   * @param {string} bitstring - Contiguous string of '0' and '1'
   * @param {Object.<string, string>} codebook - Prefix codebook mapping symbol -> code
   * @param {boolean} [asString=true] - Whether to join tokens into a string
   * @param {Object} [options]
   */
  async decompress(bitstring, codebook, asString = true, options = {}) {
    if (bitstring === null || bitstring === undefined) {
      return {
        success: false,
        error: 'Bitstring cannot be null or undefined.',
      };
    }

    if (!codebook || typeof codebook !== 'object') {
      return {
        success: false,
        error: 'A valid prefix codebook dictionary must be provided.',
      };
    }

    return this._request(
      '/api/daa/decompress',
      {
        method: 'POST',
        body: JSON.stringify({
          bitstring,
          codebook,
          as_string: Boolean(asString),
        }),
      },
      options.onLoading
    );
  }

  /**
   * Executes complete end-to-end compression, decompression, and lossless verification.
   * POST /api/daa/roundtrip
   *
   * @param {string|string[]} data - Input data
   * @param {number} [bitsPerSymbol=8]
   * @param {Object} [options]
   */
  async verifyRoundTrip(data, bitsPerSymbol = 8, options = {}) {
    if (data === null || data === undefined) {
      return {
        success: false,
        error: 'Input data cannot be null or undefined.',
      };
    }

    return this._request(
      '/api/daa/roundtrip',
      {
        method: 'POST',
        body: JSON.stringify({
          data,
          bits_per_symbol: Number(bitsPerSymbol) || 8,
        }),
      },
      options.onLoading
    );
  }
}

// Export default singleton instance
export const apiClient = new DaaApiClient();
