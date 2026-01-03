// config/adminAuth.js
// Secure admin authentication for quarter update endpoint

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * Admin authentication and security module
 * Provides secure authentication for administrative endpoints
 */

/**
 * Validate admin token format and strength
 * @param {string} token - Token to validate
 * @returns {boolean} Whether the token meets security requirements
 */
function isValidAdminToken(token) {
  // Token must be at least 32 characters (256 bits)
  if (!token || token.length < 32) {
    return false;
  }

  // Token should only contain alphanumeric characters and common symbols
  const tokenPattern = /^[A-Za-z0-9\-_+=!@#$%^&*()]+$/;
  return tokenPattern.test(token);
}

/**
 * Generate a secure admin token for initial setup
 * @returns {string} Secure random token
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Timing-safe token comparison to prevent timing attacks
 * @param {string} providedToken - Token from request
 * @param {string} actualToken - Expected token
 * @returns {boolean} Whether tokens match
 */
function secureTokenCompare(providedToken, actualToken) {
  if (!providedToken || !actualToken) {
    return false;
  }

  // Convert to buffers for timing-safe comparison
  const provided = Buffer.from(providedToken);
  const actual = Buffer.from(actualToken);

  // Length must match
  if (provided.length !== actual.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, actual);
}

/**
 * Log admin access attempts for security auditing
 * @param {Object} req - Express request
 * @param {boolean} success - Whether authentication succeeded
 * @param {string} reason - Reason for result
 */
function logAdminAttempt(req, success, reason) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    success,
    reason,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    endpoint: req.originalUrl,
    method: req.method
  };

  if (success) {
    console.log('[ADMIN ACCESS]', JSON.stringify(logEntry));
  } else {
    console.warn('[ADMIN ACCESS DENIED]', JSON.stringify(logEntry));
  }
}

/**
 * Admin authentication middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function authenticateAdmin(req, res, next) {
  const startTime = Date.now();

  // Check if admin token is configured
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    console.error('[SECURITY] Admin token not configured in environment variables');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate token format
  if (!isValidAdminToken(adminToken)) {
    console.error('[SECURITY] Admin token does not meet security requirements');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Extract bearer token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logAdminAttempt(req, false, 'Missing or invalid authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const providedToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Timing-safe comparison
  const isValid = secureTokenCompare(providedToken, adminToken);

  if (!isValid) {
    logAdminAttempt(req, false, 'Invalid token');
    // Add artificial delay to prevent timing attacks
    const delay = 100 + Math.random() * 100; // 100-200ms
    setTimeout(() => {
      return res.status(401).json({ error: 'Unauthorized' });
    }, delay);
    return;
  }

  // Check IP whitelist if configured
  if (process.env.ADMIN_IP_WHITELIST) {
    const whitelist = process.env.ADMIN_IP_WHITELIST.split(',').map(ip => ip.trim());
    const clientIp = req.ip || req.connection.remoteAddress;

    if (!whitelist.includes(clientIp)) {
      logAdminAttempt(req, false, `IP not whitelisted: ${clientIp}`);
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  // Authentication successful
  logAdminAttempt(req, true, 'Authentication successful');
  req.adminAuthenticated = true;
  req.adminAuthTime = Date.now() - startTime;

  next();
}

// Rate limiting specifically for admin endpoints
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many admin requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  },
  handler: (req, res) => {
    logAdminAttempt(req, false, 'Rate limit exceeded');
    res.status(429).json({ error: 'Too many requests' });
  }
});

/**
 * Security headers middleware for admin endpoints
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function adminSecurityHeaders(req, res, next) {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'none'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
}

/**
 * Validate environment on startup
 * @returns {boolean} Whether admin security is properly configured
 */
function validateAdminSecurity() {
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    console.warn('\n' + '='.repeat(60));
    console.warn('Warning: No ADMIN_TOKEN configured!');
    console.warn('Admin endpoints will be disabled until configured.');
    console.warn('Generate a secure token with:');
    console.warn(`  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`);
    console.warn('Then set: ADMIN_TOKEN=<generated-token>');
    console.warn('='.repeat(60) + '\n');
    return false;
  }

  if (!isValidAdminToken(adminToken)) {
    console.error('\n' + '='.repeat(60));
    console.error('SECURITY ERROR: ADMIN_TOKEN does not meet security requirements!');
    console.error('Token must be at least 32 characters long.');
    console.error('='.repeat(60) + '\n');
    return false;
  }

  console.log('Admin authentication configured securely');
  return true;
}

/**
 * Combined middleware stack for admin endpoints
 * @returns {Array} Array of middleware functions
 */
function adminMiddleware() {
  return [
    adminSecurityHeaders,
    adminRateLimiter,
    authenticateAdmin
  ];
}

module.exports = {
  authenticateAdmin,
  adminRateLimiter,
  adminSecurityHeaders,
  adminMiddleware,
  validateAdminSecurity,
  generateSecureToken,
  isValidAdminToken
};
