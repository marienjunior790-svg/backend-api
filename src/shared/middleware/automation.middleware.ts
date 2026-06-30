import { NextFunction, Request, Response } from 'express';
import { env, isAutomationApiConfigured } from '../../config/env.js';
import { UnauthorizedError } from '../errors/app.error.js';

/**
 * Authentifie les appels cron n8n → API IMMO-tec.
 * Header : X-Automation-Key: <N8N_API_KEY>
 */
export function verifyAutomationKey(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!isAutomationApiConfigured) {
      throw new UnauthorizedError('Automation API non configurée');
    }

    const key = req.headers['x-automation-key'];
    if (key !== env.N8N_API_KEY) {
      throw new UnauthorizedError('Clé automation invalide');
    }
    next();
  } catch (err) {
    next(err);
  }
}
