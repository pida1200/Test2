export class TheSportsDbError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string
  ) {
    super(message);
    this.name = "TheSportsDbError";
  }
}
