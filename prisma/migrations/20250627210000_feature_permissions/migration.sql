-- Feature access control: catalogue + permissions par utilisateur

CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_feature_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_feature_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "features_key_key" ON "features"("key");

CREATE UNIQUE INDEX "user_feature_permissions_userId_featureKey_key" ON "user_feature_permissions"("userId", "featureKey");
CREATE INDEX "user_feature_permissions_userId_idx" ON "user_feature_permissions"("userId");
CREATE INDEX "user_feature_permissions_featureKey_idx" ON "user_feature_permissions"("featureKey");

ALTER TABLE "user_feature_permissions" ADD CONSTRAINT "user_feature_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_feature_permissions" ADD CONSTRAINT "user_feature_permissions_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "features"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catalogue initial
INSERT INTO "features" ("id", "key", "label", "description", "category", "defaultEnabled", "updatedAt") VALUES
  ('feat-create-listing', 'CREATE_LISTING', 'Créer un bien', 'Ajouter un appartement ou un bien', 'biens', true, CURRENT_TIMESTAMP),
  ('feat-edit-listing', 'EDIT_LISTING', 'Modifier un bien', 'Mettre à jour les informations d''un bien', 'biens', true, CURRENT_TIMESTAMP),
  ('feat-delete-listing', 'DELETE_LISTING', 'Supprimer un bien', 'Supprimer un bien du catalogue', 'biens', true, CURRENT_TIMESTAMP),
  ('feat-publish-listing', 'PUBLISH_LISTING', 'Publier un bien', 'Changer le statut de publication/disponibilité', 'biens', true, CURRENT_TIMESTAMP),
  ('feat-create-lease', 'CREATE_LEASE', 'Créer un contrat', 'Créer un nouveau bail de location', 'contrats', true, CURRENT_TIMESTAMP),
  ('feat-edit-lease', 'EDIT_LEASE', 'Modifier un contrat', 'Modifier un bail existant', 'contrats', true, CURRENT_TIMESTAMP),
  ('feat-record-payment', 'RECORD_PAYMENT', 'Enregistrer un paiement', 'Saisir ou valider un paiement de loyer', 'paiements', true, CURRENT_TIMESTAMP),
  ('feat-send-message', 'SEND_MESSAGE', 'Envoyer un message', 'WhatsApp, email ou SMS aux locataires', 'communication', true, CURRENT_TIMESTAMP),
  ('feat-access-premium', 'ACCESS_PREMIUM', 'Accès premium', 'Fonctionnalités avancées et automatisations', 'premium', true, CURRENT_TIMESTAMP),
  ('feat-access-ai', 'ACCESS_AI', 'Assistant IA', 'Chatbot et analyses intelligentes', 'premium', true, CURRENT_TIMESTAMP);
