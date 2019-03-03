/* eslint-disable
  prefer-destructuring,
*/
import webpack from '../helpers/compiler';

describe('Options', () => {
  describe('alias', () => {
    beforeEach(() => {
      jest.resetModules()
    });

    test('pluggin alias', async () => {
      const config = {
        loader: {
          test: /(js)/,
          options: {
            alias: {
              core: 'core',
              pluggin: 'pluggin'
            },
            cartridges: [
              'storefront',
              'pluggin',
              'core'
            ]
          }
        }
      };

      const stats = await webpack('fixture.js', config);
      const [module] = stats.toJson().modules;
      const { source } = module;
      console.log(module)

      expect(source).toMatchSnapshot();
    });
  });
});
