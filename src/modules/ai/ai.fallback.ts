import type { AiOrganizationContext } from './ai.context.service.js';

/** Réponses rule-based si OpenAI indisponible (testable unitairement) */
export function buildLocalFallbackReply(message: string, ctx: AiOrganizationContext): string {
  const q = message.toLowerCase();
  const s = ctx.summary;

  if (q.includes('retard') || q.includes('impayé')) {
    if (ctx.latePayments.length === 0) {
      return `Aucun loyer en retard pour ${ctx.organization.name}. ${s.pendingPayments} paiement(s) en attente.`;
    }
    const list = ctx.latePayments
      .map((p) => `• ${p.tenantName} (${p.apartmentLabel}) : ${p.amountXaf.toLocaleString('fr-FR')} XAF — échéance ${p.dueDate}`)
      .join('\n');
    return `${s.latePayments} loyer(s) en retard :\n${list}`;
  }

  if (q.includes('encaiss') || q.includes('collect')) {
    return `Encaissements ce mois : ${s.collectedThisMonthXaf.toLocaleString('fr-FR')} XAF. ${s.latePayments} retard(s), ${s.pendingPayments} en attente.`;
  }

  if (q.includes('disponib') || q.includes('libre')) {
    if (ctx.availableApartments.length === 0) {
      return `${s.availableApartments} bien(s) disponible(s) sur ${s.totalApartments}.`;
    }
    const list = ctx.availableApartments
      .map((a) => `• ${a.label} — ${a.rentXaf.toLocaleString('fr-FR')} XAF/mois`)
      .join('\n');
    return `${s.availableApartments} bien(s) disponible(s) :\n${list}`;
  }

  if (q.includes('expir') || q.includes('contrat')) {
    if (ctx.expiringLeases.length === 0) {
      return 'Aucun contrat actif n\'expire dans les 30 prochains jours.';
    }
    const list = ctx.expiringLeases
      .map((l) => `• ${l.tenantName} — ${l.apartmentLabel} (fin : ${l.endDate})`)
      .join('\n');
    return `Contrats expirant sous 30 jours :\n${list}`;
  }

  return `Résumé ${ctx.organization.name} (${ctx.organization.city}) :
• ${s.totalApartments} biens (${s.availableApartments} dispo., ${s.occupiedApartments} occupés)
• ${s.activeLeases} contrats actifs, ${s.totalTenants} locataires
• ${s.latePayments} retard(s), ${s.collectedThisMonthXaf.toLocaleString('fr-FR')} XAF encaissés ce mois

_(Mode local — configurez OPENAI_API_KEY pour l'assistant complet)_`;
}
