import { z } from "zod";

const configSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  authToken: z.string().min(16),
  mujdumApiUrl: z.string().url(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info")
});

export type HomeMcpConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): HomeMcpConfig {
  const parsed = configSchema.safeParse({
    host: env.HOME_MCP_HOST ?? "127.0.0.1",
    port: env.HOME_MCP_PORT ?? "8766",
    authToken: env.HOME_MCP_AUTH_TOKEN,
    mujdumApiUrl: env.MUJDUM_API_URL ?? "http://127.0.0.1:3001",
    logLevel: env.HOME_MCP_LOG_LEVEL ?? "info"
  });

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid home-mcp config: ${msg}`);
  }

  return {
    ...parsed.data,
    mujdumApiUrl: parsed.data.mujdumApiUrl.replace(/\/$/, "")
  };
}
