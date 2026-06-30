import { registerSchema, loginSchema } from '../../src/modules/auth/auth.schema.js';

describe('Auth schemas (Zod)', () => {
  describe('registerSchema', () => {
    it('accepte une inscription valide', () => {
      const result = registerSchema.safeParse({
        email: 'test@agence.cg',
        password: 'Password123',
        firstName: 'Jean',
        lastName: 'Mabiala',
        organizationName: 'Agence Test',
        organizationType: 'AGENCY',
      });
      expect(result.success).toBe(true);
    });

    it('rejette un email invalide', () => {
      const result = registerSchema.safeParse({
        email: 'invalid',
        password: 'Password123',
        firstName: 'Jean',
        lastName: 'Mabiala',
        organizationName: 'Agence Test',
        organizationType: 'AGENCY',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un mot de passe trop court', () => {
      const result = registerSchema.safeParse({
        email: 'test@agence.cg',
        password: '123',
        firstName: 'Jean',
        lastName: 'Mabiala',
        organizationName: 'Agence Test',
        organizationType: 'AGENCY',
      });
      expect(result.success).toBe(false);
    });

    it('rejette un mot de passe sans majuscule', () => {
      const result = registerSchema.safeParse({
        email: 'test@agence.cg',
        password: 'password123',
        firstName: 'Jean',
        lastName: 'Mabiala',
        organizationName: 'Agence Test',
        organizationType: 'AGENCY',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepte email et mot de passe', () => {
      const result = loginSchema.safeParse({
        email: 'admin@plenitude.cg',
        password: 'Admin123!',
      });
      expect(result.success).toBe(true);
    });

    it('rejette un email vide', () => {
      const result = loginSchema.safeParse({ email: '', password: 'x' });
      expect(result.success).toBe(false);
    });
  });
});
