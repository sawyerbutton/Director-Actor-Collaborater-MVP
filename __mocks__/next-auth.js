// Mock for NextAuth v5
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

const mockHandlers = {
  GET: jest.fn().mockResolvedValue(new Response(JSON.stringify(mockSession))),
  POST: jest.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })))
};

const mockAuth = jest.fn().mockResolvedValue(mockSession);
const mockSignIn = jest.fn().mockResolvedValue({ success: true });
const mockSignOut = jest.fn().mockResolvedValue({ success: true });

// NextAuth v5 API
const NextAuth = jest.fn(() => ({
  handlers: mockHandlers,
  auth: mockAuth,
  signIn: mockSignIn,
  signOut: mockSignOut
}));

// Default export
module.exports = NextAuth;
module.exports.default = NextAuth;

// Named exports for v5 API
module.exports.handlers = mockHandlers;
module.exports.auth = mockAuth;
module.exports.signIn = mockSignIn;
module.exports.signOut = mockSignOut;

// Legacy exports for backward compatibility
module.exports.getServerSession = jest.fn().mockResolvedValue(mockSession);
module.exports.NextAuth = NextAuth;