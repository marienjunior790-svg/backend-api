/** Clés de fonctionnalités — extensible sans migration (catalogue en table `features`) */
export const FeatureKey = {
  CREATE_LISTING: 'CREATE_LISTING',
  EDIT_LISTING: 'EDIT_LISTING',
  DELETE_LISTING: 'DELETE_LISTING',
  PUBLISH_LISTING: 'PUBLISH_LISTING',
  SEND_MESSAGE: 'SEND_MESSAGE',
  ACCESS_PREMIUM: 'ACCESS_PREMIUM',
  CREATE_LEASE: 'CREATE_LEASE',
  EDIT_LEASE: 'EDIT_LEASE',
  RECORD_PAYMENT: 'RECORD_PAYMENT',
  ACCESS_AI: 'ACCESS_AI',
  ACCESS_LIA: 'ACCESS_LIA',
} as const;

export type FeatureKeyType = (typeof FeatureKey)[keyof typeof FeatureKey];

export const ALL_FEATURE_KEYS = Object.values(FeatureKey);

export const FEATURE_CATALOG: {
  key: FeatureKeyType;
  label: string;
  description: string;
  category: string;
}[] = [
  { key: FeatureKey.CREATE_LISTING, label: 'Créer un bien', description: 'Ajouter un appartement ou un bien', category: 'biens' },
  { key: FeatureKey.EDIT_LISTING, label: 'Modifier un bien', description: 'Mettre à jour les informations d\'un bien', category: 'biens' },
  { key: FeatureKey.DELETE_LISTING, label: 'Supprimer un bien', description: 'Supprimer un bien du catalogue', category: 'biens' },
  { key: FeatureKey.PUBLISH_LISTING, label: 'Publier un bien', description: 'Changer le statut de publication/disponibilité', category: 'biens' },
  { key: FeatureKey.CREATE_LEASE, label: 'Créer un contrat', description: 'Créer un nouveau bail de location', category: 'contrats' },
  { key: FeatureKey.EDIT_LEASE, label: 'Modifier un contrat', description: 'Modifier un bail existant', category: 'contrats' },
  { key: FeatureKey.RECORD_PAYMENT, label: 'Enregistrer un paiement', description: 'Saisir ou valider un paiement de loyer', category: 'paiements' },
  { key: FeatureKey.SEND_MESSAGE, label: 'Envoyer un message', description: 'WhatsApp, email ou SMS aux locataires', category: 'communication' },
  { key: FeatureKey.ACCESS_PREMIUM, label: 'Option Pro', description: 'Fonctionnalités avancées et automatisations Pro', category: 'premium' },
  { key: FeatureKey.ACCESS_AI, label: 'Assistant ITC', description: 'Chat d\'aide et conseils gestion immobilière', category: 'ia' },
  { key: FeatureKey.ACCESS_LIA, label: 'LIA — Analyses', description: 'Analyses de données et rapports intelligents', category: 'ia' },
];
