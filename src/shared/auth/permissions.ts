/**
 * Permissions RBAC — clés du catalogue (ex. BUILDING_CREATE).
 * La matrice rôle → permission est en base (RbacService).
 */
export { P, P as Permission, ALL_PERMISSION_KEYS, type PermissionKey } from '../rbac/permission-catalog.js';
export { resolveRolePermissions } from '../rbac/role-matrix.js';

/** Permissions de lecture pour gardes de ressources */
export const READ_PERMISSION_BY_RESOURCE = {
  building: 'BUILDING_VIEW',
  apartment: 'APARTMENT_VIEW',
  tenant: 'TENANT_VIEW',
  lease: 'LEASE_VIEW',
  payment: 'PAYMENT_VIEW',
  maintenance: 'MAINTENANCE_VIEW',
  application: 'APPLICATION_VIEW',
  report: 'REPORT_VIEW',
  propertyInspection: 'INSPECTION_VIEW',
} as const;
