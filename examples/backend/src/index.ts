import { z } from "zod";
import { createApp } from "./app.js";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001)
});

const env = envSchema.parse(process.env);

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`[examples/backend] listening on http://localhost:${env.PORT}`);
});

