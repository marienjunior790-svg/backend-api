export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(404, message, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Non autorisé') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé', code = 'FORBIDDEN') {
    super(403, message, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit de données') {
    super(409, message, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Données invalides') {
    super(400, message, 'VALIDATION_ERROR');
  }
}
