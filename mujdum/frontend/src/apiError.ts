export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
};

function readObjectStringProp(obj: object, key: string): string | null {
  const value = Object.getOwnPropertyDescriptor(obj, key)?.value;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

export function getApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const err = Object.getOwnPropertyDescriptor(body, "error")?.value;
  if (typeof err === "string" && err.trim()) {
    return err;
  }

  if (err && typeof err === "object") {
    const message = readObjectStringProp(err, "message");
    if (message) return message;
  }

  return fallback;
}
