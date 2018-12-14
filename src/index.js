import path from 'path';
import glob from 'glob';
import loaderUtils from 'loader-utils';
import validateOptions from 'schema-utils';
import schema from './options.json';
import checkExist from './lib/checkExist';

const rpath = /require\(([^()]+)\)|import(.*)from\s*([^;\t\r\n\s]+)/g;
const rquote = /['"]/g;
const rcartridge = /cartridges\/([^/]+)\/.+\/js\/(.*)/;

let cartridgesPath;

/**
 * Get cartridges path
 * @param {string} context - context folder
 * @param {string} cartridges - cartridges name
 * @return {Array} - return list of cartridges path
 */
function findCartridgesPath(context, cartridges) {
    return glob.sync(`${context}/**/cartridges/+(${cartridges.join('|')})/`, {
        ignore: [`**/cartridges/!(${cartridges.join('|')})/cartridge/**`, '**/node_modules/**']
    });
}

/**
 * Update required path
 * @param {string} filePath - file path
 * @return {string} - return modified required path
 */
function updateRequiredPath(filePath, { isImport, varName }) {
    return !isImport ? `require('${filePath}')` : `import ${varName} from '${filePath}'`;
}

/**
 * Get cartridge path
 * @param {string} name - cartridge name
 * @param {string} paths - cartridges path
 * @return {string} - cartridge path
 */
function getCartridgePath(name, paths) {
    return paths.find((p) => p.indexOf(name) !== -1);
}

/**
 * Get cartridge path
 * @param {string} p - path
 * @return {string} - cleaned path
 */
function cleanPath(p = '') {
    return p.replace(rquote, '').trim();
}

/**
 * Get module path
 * @param {string} name - cartridge name
 * @param {string} filePath - file path
 * @param {Array} cartridgesPath - cartridges path
 * @return {string} - cleaned path
 */
function getModulePath({ name, folder = '', filePath, cartridges }) {
  const cartridge = getCartridgePath(name, cartridges);

  return path.resolve(`${cartridge}/cartridge/client/default/js/${folder}`, filePath);
}

export default function loader(source) {
    let src = source;

    const options = loaderUtils.getOptions(this);

    validateOptions(schema, options, 'sfra module loader');

    let cartridges = options.cartridges;
    let cache = options.cache;
    let match = rcartridge.exec(this.resourcePath);
    let curCartridge = match && match[1];
    const curFilePath = match && match[2];

    if (cache !== false) {
      cache = true;
    }

    if (!options.context) {
        options.context = path.resolve(this.rootContext, '../');
    }

    if (typeof cartridges === 'string') {
      cartridges = cartridges.split(':');
    }

    if (cartridges && cartridges.length) {
        if (!cartridgesPath || !cache) {
            cartridgesPath = findCartridgesPath(options.context, cartridges);
        }

        if (cartridgesPath.length) {
            src = src.replace(rpath, (full, m1, m2, m3) => {
                const p1 = cleanPath(m1);
                const p3 = cleanPath(m3);
                const p = p1 || p3;
                const isImport = !!p3;
                const varName = m2 && m2.trim();
                const isRel = p.startsWith('.');

                if (p && (p.startsWith('*') || isRel)) {
                  let idx = 0;

                  if (curCartridge) {
                    const curMod = getModulePath({ name: curCartridge, filePath: p.slice(2), cartridges: cartridgesPath});

                    // is self reference?
                    if (this.resourcePath.indexOf(curMod) !== -1) {
                      idx = cartridges.indexOf(curCartridge) + 1;
                    }
                  }

                  const cars = cartridges.slice(idx);

                  for (let i = 0; i < cars.length; i++) {
                      const name = cars[i];

                      let mod;
                      if (isRel && curFilePath) {
                        mod = getModulePath({name, folder: curFilePath.slice(0, curFilePath.lastIndexOf('/')), filePath: p, cartridges: cartridgesPath});
                      } else {
                        mod = getModulePath({ name, filePath: p.slice(2), cartridges: cartridgesPath });
                      }

                      if (checkExist(mod) && this.resourcePath.indexOf(mod) < 0) {
                          return updateRequiredPath(mod, {
                              isImport,
                              varName
                          });
                      }
                  }
                }

                return updateRequiredPath(p, {
                    isImport,
                    varName
                });
            });
        }
    }
    console.log(src)
    return src;
};
