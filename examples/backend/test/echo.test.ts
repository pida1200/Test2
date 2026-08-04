import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("POST /echo", () => {
  it("echoes message", async () => {
    const app = createApp();
    const res = await request(app).post("/echo").send({ message: "hello" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "hello" });
  });

  it("accepts exactly 200 chars", async () => {
    const app = createApp();
    const msg = "a".repeat(200);
    const res = await request(app).post("/echo").send({ message: msg });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: msg });
  });

  it("returns 400 for 201 chars", async () => {
    const app = createApp();
    const msg = "a".repeat(201);
    const res = await request(app).post("/echo").send({ message: msg });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "message" })])
    );
  });

  it("returns 400 for empty message", async () => {
    const app = createApp();
    const res = await request(app).post("/echo").send({ message: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: "VALIDATION_ERROR", message: "Invalid request", issues: expect.any(Array) });
    expect(res.body.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "message" })])
    );
  });

  it("returns 400 for missing body / wrong type", async () => {
    const app = createApp();

    const resMissing = await request(app).post("/echo");
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error.code).toBe("VALIDATION_ERROR");
    expect(resMissing.body.error.message).toBe("Invalid request");

    const resWrongType = await request(app).post("/echo").send({ message: 123 });
    expect(resWrongType.status).toBe(400);
    expect(resWrongType.body.error.code).toBe("VALIDATION_ERROR");
    expect(resWrongType.body.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "message" })])
    );
  });

  it("returns 400 for missing message key", async () => {
    const app = createApp();
    const res = await request(app).post("/echo").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "message" })])
    );
  });
});

