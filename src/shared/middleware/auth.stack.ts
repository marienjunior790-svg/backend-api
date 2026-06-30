import { authMiddleware } from './auth.middleware.js';
import { validateSessionMiddleware } from './session.middleware.js';

/** Chaîne standard : JWT + revalidation compte actif. */
export const authenticatedStack = [authMiddleware, validateSessionMiddleware];
