/** Configuration du parcours 3 — suivi des loyers */
export const RENT_FOLLOW_UP = {
  /** Jours avant échéance pour le rappel automatique */
  reminderDaysBefore: 3,
  /** Relances progressives après la date d'échéance (jours) */
  dunningDaysAfterDue: [1, 7, 15] as const,
  /** Correspondance jour → type de relance */
  dunningTypeByDay: {
    1: 'DUNNING_L1',
    7: 'DUNNING_L2',
    15: 'DUNNING_L3',
  } as const,
  /** Alerte propriétaire si toujours impayé après N jours */
  ownerAlertDaysAfterDue: 15,
} as const;

export type DunningDay = (typeof RENT_FOLLOW_UP.dunningDaysAfterDue)[number];
