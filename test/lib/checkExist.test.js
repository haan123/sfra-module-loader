import { invalidateRequire } from '../../src/lib/checkExist';

describe('Lib', () => {
  describe('checkExist', () => {
    test('invalidateRequire - {True}', async () => {
      let req = {
        cache: {
          'dum.my': 'dummy'
        }
      };
      const p = 'dum.my';

      const stat = invalidateRequire(p, req);

      expect(stat).toBe(true);
    });

    test('invalidateRequire - {False}', async () => {
      let req = {
        cache: {
          'dummy': 'dummy'
        }
      };
      const p = 'dum.my';

      const stat = invalidateRequire(p, req);

      expect(stat).toBe(false);
    });
  });
});
