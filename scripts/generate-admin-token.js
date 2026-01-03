#!/usr/bin/env node
// scripts/generate-admin-token.js
// Utility script to generate secure admin tokens

const crypto = require('crypto');

function generateSecureToken() {
  return crypto.randomBytes(32).toString('base64url');
}

const token = generateSecureToken();

console.log('\nGenerated secure admin token:');
console.log(`  ${token}`);
console.log('\nToken meets all security requirements');
console.log('\nAdd this to your .env file:');
console.log(`ADMIN_TOKEN=${token}\n`);
