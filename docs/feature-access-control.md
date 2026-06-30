# Feature Access Control

Système de permissions par utilisateur (feature flags) pour IMMO-tec.

## Tables

- `features` — catalogue des fonctionnalités
- `user_feature_permissions` — override par utilisateur (`is_enabled`)

Par défaut, toutes les features sont **activées**. Seul un override explicite `is_enabled = false` bloque l'action.

## API

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/v1/features/me` | Utilisateur connecté |
| GET | `/api/v1/admin/users` | Liste des utilisateurs (org ou tous) |
| GET | `/api/v1/admin/users/:id/features` | ORG_ADMIN, SUPER_ADMIN |
| POST | `/api/v1/admin/users/:id/features/enable` | ORG_ADMIN, SUPER_ADMIN |
| POST | `/api/v1/admin/users/:id/features/disable` | ORG_ADMIN, SUPER_ADMIN |

Body enable/disable : `{ "featureKey": "CREATE_LISTING" }`

## Feature keys

`CREATE_LISTING`, `EDIT_LISTING`, `DELETE_LISTING`, `PUBLISH_LISTING`, `CREATE_LEASE`, `EDIT_LEASE`, `RECORD_PAYMENT`, `SEND_MESSAGE`, `ACCESS_PREMIUM`, `ACCESS_AI`

## Démo seed

`agent@plenitude.cg` a `CREATE_LISTING` désactivé (mot de passe : `Admin123!`).

## Exemple cURL

```bash
# Lister les permissions d'un utilisateur
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/admin/users/USER_ID/features

# Désactiver création de biens
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureKey":"CREATE_LISTING"}' \
  http://localhost:3000/api/v1/admin/users/USER_ID/features/disable
```

## Flutter

Les permissions sont retournées dans `/auth/login`, `/auth/me` (`permissions` map) et utilisées via `userPermissionsProvider`.
