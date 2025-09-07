// Mock Next.js server APIs for testing
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Request/Response APIs
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    
    constructor(url: string | URL, init?: RequestInit) {
      this.url = url.toString();
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
    }
    
    json() {
      return Promise.resolve({});
    }
  } as any;
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    body: any;
    status: number;
    headers: Headers;
    
    constructor(body?: any, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }
    
    json() {
      return Promise.resolve(this.body);
    }
  } as any;
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    private headers: Map<string, string> = new Map();
    
    constructor(init?: HeadersInit) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value as string));
        }
      }
    }
    
    set(key: string, value: string) {
      this.headers.set(key.toLowerCase(), value);
    }
    
    get(key: string) {
      return this.headers.get(key.toLowerCase()) || null;
    }
    
    has(key: string) {
      return this.headers.has(key.toLowerCase());
    }
    
    entries() {
      return this.headers.entries();
    }
    
    forEach(callback: (value: string, key: string) => void) {
      this.headers.forEach(callback);
    }
  } as any;
}

// Mock crypto for Node.js < 19
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  } as any;
}

export {};