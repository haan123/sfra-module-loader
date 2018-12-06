import path from 'path';
import glob from 'glob';
import loaderUtils from 'loader-utils';
import validateOptions from 'schema-utils';
import schema from './options.json';
import checkExist from './lib/checkExist';

const rpath = /require\(([^()]+)\)|import(.*)from\s*([^;\t\r\n\s]+)/g;
const rquote = /['"]/g;

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

export default function loader(source) {
    let src = source;

    const options = loaderUtils.getOptions(this);

    validateOptions(schema, options, 'sfra module loader');

    let cartridges = options.cartridges;
    let cache = options.cache;

    if (cache !== false) {
      cache = true;
    }

    if (!options.context) {
        options.context = path.resolve(__dirname, '../');
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

                if (p && p.startsWith('*')) {
                    for (let i = 0; i < cartridges.length; i++) {
                        const name = cartridges[i];
                        const cartridge = getCartridgePath(name, cartridgesPath);

                        let mod = path.resolve(`${cartridge}/cartridge/client/default/js/${p.slice(2)}`);

                        if (checkExist(mod)) {
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

    return src;
};
