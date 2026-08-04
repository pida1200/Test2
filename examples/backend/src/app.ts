import cors from "cors";
import express from "express";
import { z } from "zod";
import { HttpError } from "./httpErrors.js";

const envSchema = z.object({
  CORS_ORIGIN: z.string().optional(),
  JSON_BODY_LIMIT: z.string().default("1mb")
});

const echoRequestSchema = z.object({
  message: z.string().min(1).max(200)
});

function toValidationIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.slice(0, 10).map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "$",
    message: issue.message
  }));
}

export function createApp(env: NodeJS.ProcessEnv = process.env) {
  const parsedEnv = envSchema.parse(env);

  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: parsedEnv.JSON_BODY_LIMIT }));
  app.use(
    cors({
      origin: parsedEnv.CORS_ORIGIN ? [parsedEnv.CORS_ORIGIN] : true,
      credentials: true
    })
  );

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/echo", (req, res) => {
    const parsed = echoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json(
          new HttpError(400, "VALIDATION_ERROR", "Invalid request", {
            issues: toValidationIssues(parsed.error)
          }).toBody()
        );
      return;
    }

    res.status(200).json({ message: parsed.data.message });
  });

  app.use((_req, _res, next) => {
    next(new HttpError(404, "NOT_FOUND", "Route not found"));
  });

  app.use(((err, _req, res, _next) => {
    // Invalid JSON body
    if (err instanceof SyntaxError && "status" in err && err.status === 400) {
      res.status(400).json(new HttpError(400, "INVALID_JSON", "Invalid JSON").toBody());
      return;
    }

    // Body too large
    if (isBodyTooLargeError(err)) {
      res.status(413).json(new HttpError(413, "PAYLOAD_TOO_LARGE", "Payload too large").toBody());
      return;
    }

    if (err instanceof HttpError) {
      res.status(err.status).json(err.toBody());
      return;
    }

    res
      .status(500)
      .json(new HttpError(500, "INTERNAL_SERVER_ERROR", "Unexpected error").toBody());
  }) satisfies express.ErrorRequestHandler);

  return app;
}

function isBodyTooLargeError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;

  const maybe = err as Record<string, unknown>;
  const status = typeof maybe.status === "number" ? maybe.status : undefined;
  const statusCode = typeof maybe.statusCode === "number" ? maybe.statusCode : undefined;
  const type = typeof maybe.type === "string" ? maybe.type : undefined;

  return status === 413 || statusCode === 413 || type === "entity.too.large";
}

