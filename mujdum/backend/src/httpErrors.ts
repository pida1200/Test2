import { z } from "zod";

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z
      .array(
        z.object({
          path: z.string(),
          message: z.string()
        })
      )
      .optional()
  })
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly issues?: Array<{ path: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { issues?: Array<{ path: string; message: string }> }
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = options?.issues;
  }

  toBody(): ErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.issues === undefined ? {} : { issues: this.issues })
      }
    };
  }
}

export function sendError(
  res: { status: (code: number) => { json: (body: ErrorBody) => void } },
  status: number,
  code: string,
  message: string,
  options?: { issues?: Array<{ path: string; message: string }> }
) {
  res.status(status).json(new HttpError(status, code, message, options).toBody());
}
