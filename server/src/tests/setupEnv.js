process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/protek_test?schema=public"
process.env.JWT_SECRET = "test-only-secret-width-at-least-32-characters"
process.env.OTP_HMAC_SECRET = "test-only-otp-hmac-secret-width-over-32-characters"
process.env.MAIL_DRIVER = "console"
process.env.CORS_ORIGINS = "http://localhost:3000"
process.env.LOG_LEVEL = "silent"