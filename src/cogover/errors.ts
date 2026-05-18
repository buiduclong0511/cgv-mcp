export class CogoverApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly raw: unknown,
  ) {
    super(message);
    this.name = "CogoverApiError";
  }
}
