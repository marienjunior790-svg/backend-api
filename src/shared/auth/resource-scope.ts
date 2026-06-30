import { ForbiddenError, NotFoundError } from '../errors/app.error.js';

/** Vérifie que la ressource appartient à l'organisation de l'utilisateur. */
export function assertSameOrganization(resourceOrgId: string, userOrgId: string | null | undefined): void {
  if (!userOrgId || resourceOrgId !== userOrgId) {
    throw new ForbiddenError('Accès refusé — ressource hors périmètre');
  }
}

export function assertResourceOwner(resourceOwnerId: string, userId: string): void {
  if (resourceOwnerId !== userId) {
    throw new ForbiddenError('Accès refusé — ressource non autorisée');
  }
}

export function requireFound<T>(resource: T | null | undefined, message = 'Ressource introuvable'): T {
  if (!resource) throw new NotFoundError(message);
  return resource;
}
