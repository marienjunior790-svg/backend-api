import { inject, injectable } from 'tsyringe';
import { UserRole } from '@prisma/client';
import { env } from '../../config/env.js';
import { OpenAiClient, ChatMessage } from '../../infrastructure/openai/openai.client.js';
import { AiContextService } from './ai.context.service.js';
import { buildLocalFallbackReply } from './ai.fallback.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';
import { PlanLimitError } from '../../shared/errors/subscription.error.js';
import type { AiAnalyzeDto, AiChatInput } from './ai.types.js';

export interface AiChatResponse {
  reply: string;
  suggestions: string[];
  poweredBy: 'openai' | 'local';
  contextUsed: boolean;
}

export interface AiAnalysisMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface AiAnalysisResponse {
  title: string;
  summary: string;
  metrics: AiAnalysisMetric[];
  insights: string[];
  recommendations: string[];
  poweredBy: 'openai' | 'local';
}

const ASSISTANT_PROMPT = `Tu es l'assistant ITC (ITC IMMO • TEC • CONSEIL), expert en gestion immobilière à Brazzaville (Congo).
Tu réponds en français, de manière concise et professionnelle.
Tu es un assistant conversationnel : aide, conseils, explications — PAS d'analyses statistiques détaillées (renvoie vers LIA pour ça).
Tu t'appuies UNIQUEMENT sur le contexte JSON fourni — ne invente pas de données.
Monnaie : XAF (Franc CFA).
Si une information n'est pas dans le contexte, dis-le clairement.
Propose des actions concrètes (relancer locataire, renouveler contrat, etc.).`;

const LIA_ANALYSIS_PROMPT = `Tu es LIA (Logiciel d'Intelligence Analytique) pour ITC IMMO • TEC • CONSEIL.
Tu produis des analyses de données immobilières structurées en français.
Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "title": "Titre de l'analyse",
  "summary": "Résumé exécutif en 2-3 phrases",
  "metrics": [{"label": "...", "value": "...", "trend": "up|down|neutral"}],
  "insights": ["Point clé 1", "Point clé 2"],
  "recommendations": ["Action 1", "Action 2"]
}
Base-toi STRICTEMENT sur le contexte JSON. Monnaie : XAF.`;

@injectable()
export class AiService {
  constructor(
    @inject(OpenAiClient) private readonly openai: OpenAiClient,
    @inject(AiContextService) private readonly contextService: AiContextService,
    @inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
  ) {}

  getSuggestions(): string[] {
    return [
      'Comment ajouter un locataire ?',
      'Comment enregistrer un paiement de loyer ?',
      'Quelle est la différence entre Assistant et LIA ?',
      'Comment créer un contrat de location ?',
      'Où voir mes biens immobiliers ?',
    ];
  }

  getAnalysisTypes(): Array<{ key: string; label: string; description: string }> {
    return [
      { key: 'overview', label: 'Vue d\'ensemble', description: 'Situation globale du parc immobilier' },
      { key: 'revenue', label: 'Revenus', description: 'Encaissements et performance financière' },
      { key: 'occupancy', label: 'Occupation', description: 'Taux d\'occupation et disponibilités' },
      { key: 'delinquency', label: 'Impayés', description: 'Retards de paiement et risques' },
    ];
  }

  async chat(
    organizationId: string,
    userId: string,
    role: UserRole,
    input: AiChatInput,
  ): Promise<AiChatResponse> {
    await this.assertAiAccess(organizationId, userId, role);

    const ctx = await this.contextService.buildContext(organizationId);
    const contextJson = this.contextService.toPromptContext(ctx);
    const suggestions = this.getSuggestions();

    if (!this.openai.isAvailable()) {
      return {
        reply: buildLocalFallbackReply(input.message, ctx),
        suggestions,
        poweredBy: 'local',
        contextUsed: true,
      };
    }

    const history = (input.history ?? []).slice(-env.AI_MAX_HISTORY);
    const messages: ChatMessage[] = [
      { role: 'system', content: ASSISTANT_PROMPT },
      { role: 'system', content: `Contexte organisation (JSON):\n${contextJson}` },
      ...history.map((h) => ({ role: h.role, content: h.content }) as ChatMessage),
      { role: 'user', content: input.message },
    ];

    const reply = await this.openai.chat(messages);

    return {
      reply,
      suggestions,
      poweredBy: 'openai',
      contextUsed: true,
    };
  }

  async analyze(
    organizationId: string,
    userId: string,
    role: UserRole,
    input: AiAnalyzeDto,
  ): Promise<AiAnalysisResponse> {
    await this.assertLiaAccess(organizationId, userId, role);

    const ctx = await this.contextService.buildContext(organizationId);
    const contextJson = this.contextService.toPromptContext(ctx);
    const typeLabel = this.getAnalysisTypes().find((t) => t.key === input.analysisType)?.label ?? input.analysisType;

    if (!this.openai.isAvailable()) {
      return this.buildLocalAnalysis(ctx, input.analysisType, typeLabel);
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: LIA_ANALYSIS_PROMPT },
      { role: 'system', content: `Contexte organisation (JSON):\n${contextJson}` },
      {
        role: 'user',
        content: `Produis une analyse de type "${typeLabel}" (${input.analysisType}) pour cette organisation.`,
      },
    ];

    const raw = await this.openai.chat(messages);
    try {
      const parsed = JSON.parse(raw) as AiAnalysisResponse;
      return { ...parsed, poweredBy: 'openai' };
    } catch {
      return {
        title: typeLabel,
        summary: raw.slice(0, 500),
        metrics: [],
        insights: [raw],
        recommendations: [],
        poweredBy: 'openai',
      };
    }
  }

  private buildLocalAnalysis(
    ctx: Awaited<ReturnType<AiContextService['buildContext']>>,
    analysisType: string,
    typeLabel: string,
  ): AiAnalysisResponse {
    const s = ctx.summary;
    const occupancyRate = s.totalApartments > 0
      ? Math.round((s.occupiedApartments / s.totalApartments) * 100)
      : 0;

    const metrics: AiAnalysisMetric[] = [
      { label: 'Appartements', value: `${s.totalApartments}`, trend: 'neutral' },
      { label: 'Occupés', value: `${s.occupiedApartments}`, trend: 'neutral' },
      { label: 'Disponibles', value: `${s.availableApartments}`, trend: 'neutral' },
      { label: 'Taux occupation', value: `${occupancyRate}%`, trend: occupancyRate >= 80 ? 'up' : 'down' },
      { label: 'Encaissé ce mois', value: `${s.collectedThisMonthXaf.toLocaleString('fr-FR')} XAF`, trend: 'up' },
      { label: 'Impayés', value: `${s.latePayments}`, trend: s.latePayments > 0 ? 'down' : 'up' },
    ];

    const insights: string[] = [];
    const recommendations: string[] = [];

    if (analysisType === 'revenue' || analysisType === 'overview') {
      insights.push(`Encaissements du mois : ${s.collectedThisMonthXaf.toLocaleString('fr-FR')} XAF`);
      if (s.latePayments > 0) {
        recommendations.push('Relancer les locataires en retard de paiement');
      }
    }
    if (analysisType === 'occupancy' || analysisType === 'overview') {
      insights.push(`Taux d'occupation : ${occupancyRate}% (${s.occupiedApartments}/${s.totalApartments} portes)`);
      if (s.availableApartments > 0) {
        recommendations.push(`${s.availableApartments} bien(s) disponible(s) — envisager une commercialisation`);
      }
    }
    if (analysisType === 'delinquency' || analysisType === 'overview') {
      insights.push(`${s.latePayments} paiement(s) en retard, ${s.pendingPayments} en attente`);
      if (s.latePayments > 0) {
        recommendations.push('Consulter la liste des impayés et envoyer des relances');
      }
    }

    return {
      title: `Analyse LIA — ${typeLabel}`,
      summary: `Situation de ${ctx.organization.name} : ${s.totalApartments} portes, ${occupancyRate}% d'occupation, ${s.latePayments} impayé(s).`,
      metrics,
      insights: insights.length ? insights : ['Données insuffisantes pour une analyse approfondie'],
      recommendations: recommendations.length ? recommendations : ['Complétez vos biens et locataires pour des analyses plus précises'],
      poweredBy: 'local',
    };
  }

  private async assertAiAccess(organizationId: string, userId: string, role: UserRole): Promise<void> {
    const subCtx = await this.subscriptionService.resolveAccessContext(organizationId);
    const { getPlanLimits } = await import('../../shared/constants/plan-limits.js');
    const limits = getPlanLimits(subCtx.plan);

    if (!limits.aiAssistant) {
      throw new PlanLimitError('Assistant ITC disponible à partir du plan Pro', 'aiAssistant');
    }

    await this.subscriptionService.assertUserProAccess(userId, organizationId, role);
  }

  private async assertLiaAccess(organizationId: string, userId: string, role: UserRole): Promise<void> {
    await this.subscriptionService.assertUserProAccess(userId, organizationId, role);
  }
}
