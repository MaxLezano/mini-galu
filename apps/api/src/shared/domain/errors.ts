/** Errores de dominio/aplicación. La capa HTTP los traduce a status codes; el dominio no sabe de HTTP. */
export abstract class AppError extends Error {
  abstract readonly code: string;
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  readonly code = "not_found";
}

export class ValidationError extends AppError {
  readonly code = "validation_error";
}

export class ConflictError extends AppError {
  readonly code = "conflict";
}

export class UnauthorizedError extends AppError {
  readonly code = "unauthorized";
}
