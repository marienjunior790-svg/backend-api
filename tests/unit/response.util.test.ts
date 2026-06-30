import { toPaginationMeta, getPagination } from '../../src/shared/utils/response.util.js';

describe('Response utils', () => {
  describe('getPagination', () => {
    it('calcule page et skip par défaut', () => {
      const { page, limit, skip } = getPagination({});
      expect(page).toBe(1);
      expect(limit).toBe(20);
      expect(skip).toBe(0);
    });

    it('respecte page et limit custom', () => {
      const { page, limit, skip } = getPagination({ page: '3', limit: '10' });
      expect(page).toBe(3);
      expect(limit).toBe(10);
      expect(skip).toBe(20);
    });

    it('plafonne limit à 100', () => {
      const { limit } = getPagination({ limit: '500' });
      expect(limit).toBe(100);
    });
  });

  describe('toPaginationMeta', () => {
    it('calcule totalPages', () => {
      expect(toPaginationMeta(1, 20, 45)).toEqual({
        page: 1,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });
  });
});
