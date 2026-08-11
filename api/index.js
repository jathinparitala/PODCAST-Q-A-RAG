/**
 * Vercel Serverless Function Entry Point
 * Wraps Express backend server for Vercel serverless deployment.
 */

const app = require('../server/index');

module.exports = app;
