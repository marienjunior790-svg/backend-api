import { injectable } from 'tsyringe';
import { RentalApplication } from '@prisma/client';
import { decimalToNumber } from '../../shared/utils/response.util.js';

export interface ScoringResult {
  score: number;
  summary: string;
  factors: string[];
}

type AppForScoring = RentalApplication & {
  apartment: { rentAmount: { toNumber?: () => number } | number };
  documents?: { category: string }[];
};

@injectable()
export class ApplicationScoringService {
  scoreApplication(app: AppForScoring): ScoringResult {
    const factors: string[] = [];
    let score = 50;

    if (app.idNumber && app.idNumber.length >= 5) {
      score += 10;
      factors.push('Pièce d\'identité renseignée');
    } else {
      factors.push('Pièce d\'identité manquante');
      score -= 10;
    }

    if (app.profession) {
      score += 8;
      factors.push(`Profession : ${app.profession}`);
    }

    const rent = decimalToNumber(app.apartment.rentAmount as { toNumber?: () => number });
    const income = app.monthlyIncome ? decimalToNumber(app.monthlyIncome as { toNumber?: () => number }) : 0;

    if (income > 0 && rent > 0) {
      const ratio = income / rent;
      if (ratio >= 3) {
        score += 25;
        factors.push(`Revenus solides (${Math.round(ratio)}× le loyer)`);
      } else if (ratio >= 2) {
        score += 15;
        factors.push(`Revenus corrects (${ratio.toFixed(1)}× le loyer)`);
      } else if (ratio >= 1.2) {
        score += 5;
        factors.push(`Revenus limites (${ratio.toFixed(1)}× le loyer)`);
      } else {
        score -= 15;
        factors.push('Revenus insuffisants par rapport au loyer');
      }
    } else {
      factors.push('Revenus non renseignés');
      score -= 5;
    }

    if (app.guarantorName && app.guarantorPhone) {
      score += 12;
      factors.push('Garant renseigné');
    }

    const docCount = app.documents?.length ?? 0;
    if (docCount >= 3) {
      score += 10;
      factors.push(`Dossier documenté (${docCount} pièces)`);
    } else if (docCount >= 1) {
      score += 5;
      factors.push(`${docCount} document(s) joint(s)`);
    } else {
      factors.push('Peu de documents');
      score -= 5;
    }

    if (app.address) {
      score += 3;
      factors.push('Adresse renseignée');
    }

    score = Math.max(0, Math.min(100, score));

    let summary: string;
    if (score >= 75) summary = 'Profil solvable — recommandation favorable.';
    else if (score >= 55) summary = 'Profil acceptable — vérification complémentaire conseillée.';
    else if (score >= 40) summary = 'Profil à risque — examen approfondi requis.';
    else summary = 'Profil fragile — refus recommandé sans garanties supplémentaires.';

    return { score, summary, factors };
  }
}
