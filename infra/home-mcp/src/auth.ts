import type { Request, Response, NextFunction } from "express";

export function createBearerAuth(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const token = header.slice("Bearer ".length).trim();
    if (token !== expectedToken) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  };
}
