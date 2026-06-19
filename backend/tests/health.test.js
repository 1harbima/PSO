import request from "supertest";
import express from "express";
import healthRoutes from "../routes/health.js";

// Setup test app (tanpa MongoDB connection)
const app = express();
app.use(express.json());
app.use("/api/health", healthRoutes);

describe("Health Check Endpoint", () => {
  describe("GET /api/health", () => {
    it("should return status 200", async () => {
      const response = await request(app).get("/api/health");
      expect(response.status).toBe(200);
    });

    it("should return status OK", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body.status).toBe("OK");
    });

    it("should return a message", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe("string");
    });

    it("should return a timestamp", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it("should return a version field", async () => {
      const response = await request(app).get("/api/health");
      expect(response.body.version).toBeDefined();
    });
  });

  describe("GET /api/health/ping", () => {
    it("should return status 200", async () => {
      const response = await request(app).get("/api/health/ping");
      expect(response.status).toBe(200);
    });

    it("should return pong: true", async () => {
      const response = await request(app).get("/api/health/ping");
      expect(response.body.pong).toBe(true);
    });
  });
});
