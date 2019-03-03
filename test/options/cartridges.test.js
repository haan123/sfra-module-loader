/* eslint-disable
  prefer-destructuring,
*/
import webpack from '../helpers/compiler';

describe('Options', () => {
  describe('cartridges', () => {
    beforeEach(() => {
      jest.resetModules()
    });

    test('{Array}', async () => {
      const config = {
        loader: {
          test: /(js)/,
          options: {
            alias: {
              pluggin: 'pluggin',
              core: 'core'
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

      expect(source).toMatchSnapshot();
    });

    test('{String}', async () => {
      const config = {
        loader: {
          test: /(js)/,
          options: {
            alias: {
              pluggin: 'pluggin',
              core: 'core'
            },
            cartridges: 'storefront:pluggin:core'
          }
        }
      };

      const stats = await webpack('fixture.js', config);
      const [module] = stats.toJson().modules;
      const { source } = module;

      expect(source).toMatchSnapshot();
    });

    test('cartridges does not exist', async () => {
      const config = {
        loader: {
          test: /(js)/,
          options: {
            alias: {
              pluggin: 'pluggin',
              core: 'core'
            },
            cartridges: 'abc'
          }
        }
      };

      const stats = await webpack('fixture.js', config);
      const [module] = stats.toJson().modules;
      const { source } = module;

      expect(source).toMatchSnapshot();
    });

  });
});
