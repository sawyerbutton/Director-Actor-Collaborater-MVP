/**
 * CSRF Token Service
 * Manages CSRF tokens for API requests
 */
class CSRFService {
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private readonly TOKEN_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Get or generate a CSRF token
   */
  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    // In production, fetch from server endpoint
    // For now, generate client-side token as placeholder
    this.token = this.generateToken();
    this.tokenExpiry = Date.now() + this.TOKEN_TTL;
    
    // Store in sessionStorage for XSS protection
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('csrf-token', this.token);
      sessionStorage.setItem('csrf-expiry', this.tokenExpiry.toString());
    }
    
    return this.token;
  }

  /**
   * Generate a cryptographically secure token
   */
  private generateToken(): string {
    if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for non-browser environments
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Validate token matches expected value
   */
  validateToken(token: string): boolean {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      return false;
    }
    return token === this.token;
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = 0;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('csrf-token');
      sessionStorage.removeItem('csrf-expiry');
    }
  }

  /**
   * Load token from storage if available
   */
  loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('csrf-token');
      const storedExpiry = sessionStorage.getItem('csrf-expiry');
      
      if (storedToken && storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (Date.now() < expiry) {
          this.token = storedToken;
          this.tokenExpiry = expiry;
        }
      }
    }
  }
}

export const csrfService = new CSRFService();