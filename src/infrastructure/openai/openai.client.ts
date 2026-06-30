import OpenAI from 'openai';
import { injectable } from 'tsyringe';
import { env, isOpenAiConfigured } from '../../config/env.js';
import { ValidationError } from '../../shared/errors/app.error.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@injectable()
export class OpenAiClient {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!isOpenAiConfigured) {
      throw new ValidationError('Assistant IA non configuré (OPENAI_API_KEY manquante)');
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return this.client;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const client = this.getClient();
    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new ValidationError('Réponse IA vide');
    return content.trim();
  }

  /** Mode dégradé sans clé API — réponses basées sur le contexte local */
  isAvailable(): boolean {
    return isOpenAiConfigured;
  }
}
