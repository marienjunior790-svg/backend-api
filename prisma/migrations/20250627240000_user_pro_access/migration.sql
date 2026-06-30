-- Accès option Pro par utilisateur (contrôle admin)
ALTER TABLE "users" ADD COLUMN "proAccessEnabled" BOOLEAN NOT NULL DEFAULT false;
