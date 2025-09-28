// Mock for NextAuth Credentials Provider
const CredentialsProvider = jest.fn((config) => ({
  id: 'credentials',
  name: config.name || 'Credentials',
  type: 'credentials',
  credentials: config.credentials || {},
  authorize: config.authorize || jest.fn()
}));

module.exports = CredentialsProvider;
module.exports.default = CredentialsProvider;