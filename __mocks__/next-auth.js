module.exports = {
  getServerSession: jest.fn(),
  NextAuth: jest.fn(() => ({
    GET: jest.fn(),
    POST: jest.fn()
  }))
};