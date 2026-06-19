import express from "express";

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint - returns server status
 * Useful for CI/CD pipelines and load balancer health checks
 */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Library Management System API is running",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

/**
 * GET /api/health/ping
 * Simple ping endpoint
 */
router.get("/ping", (req, res) => {
  res.status(200).json({ pong: true });
});

export default router;
