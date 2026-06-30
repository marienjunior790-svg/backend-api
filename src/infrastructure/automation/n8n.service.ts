import { injectable } from 'tsyringe';
import { env, isN8nConfigured } from '../../config/env.js';
import { AutomationEvent, AutomationPayload, N8N_WEBHOOK_PATHS } from './automation.events.js';

/**
 * Émet des webhooks vers n8n de manière asynchrone (non-bloquante).
 * Si n8n est indisponible, l'API métier n'est pas impactée.
 */
@injectable()
export class N8nWebhookService {
  /**
   * Envoie un événement à n8n — fire-and-forget.
   */
  emit(payload: Omit<AutomationPayload, 'timestamp'>): void {
    if (!isN8nConfigured) return;

    const fullPayload: AutomationPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const path = N8N_WEBHOOK_PATHS[payload.event];
    const url = `${env.N8N_WEBHOOK_BASE_URL!.replace(/\/$/, '')}${path}`;

    // Non-bloquant : pas d'await dans le flux métier
    this.postWebhook(url, fullPayload).catch((err) => {
      console.warn(`[n8n] Webhook échoué (${payload.event}):`, err instanceof Error ? err.message : err);
    });
  }

  private async postWebhook(url: string, payload: AutomationPayload): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
