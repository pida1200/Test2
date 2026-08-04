import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { createBearerAuth } from "./auth.js";
import { MujdumClient } from "./clients/mujdumClient.js";
import { createMcpServer } from "./server.js";

function methodNotAllowed(res: express.Response) {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null
  });
}

async function main() {
  const config = loadConfig();
  const mujdum = new MujdumClient(config.mujdumApiUrl);

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "home-mcp" });
  });

  const mcpAuth = createBearerAuth(config.authToken);

  app.post("/mcp", mcpAuth, async (req, res) => {
    const server = createMcpServer(mujdum);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        transport.close();
        server.close();
      });
    } catch (err) {
      console.error("[home-mcp] MCP request error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });

  app.get("/mcp", mcpAuth, (_req, res) => methodNotAllowed(res));
  app.delete("/mcp", mcpAuth, (_req, res) => methodNotAllowed(res));

  app.listen(config.port, config.host, () => {
    console.log(
      `[home-mcp] listening on http://${config.host}:${config.port}/mcp (mujdum: ${config.mujdumApiUrl})`
    );
  });
}

main().catch((err) => {
  console.error("[home-mcp] fatal:", err);
  process.exit(1);
});
