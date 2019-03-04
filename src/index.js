import path from 'path';
import glob from 'glob';
import loaderUtils from 'loader-utils';
import validateOptions from 'schema-utils';
import schema from './options.json';
import checkExist from './lib/checkExist';

const rpath = /([\w_$]*)[\s=]*require\(([^()]+)\)|import(.*)from\s*([^;\t\r\n\s]+)/g;
const rquote = /['"]/g;
const rcartridge = /cartridges\/([^/]+)\/.+\/([^/]+)\/js\/(.*)/;

let cartridgePaths;

/**
 * Get cartridges path
 * @param {string} context - context folder
 * @param {string} cartridges - cartridges name
 * @return {Array} - return list of cartridges path
 */
function findCartridgePaths(context, cartridges) {
  return glob.sync(`${context}/**/cartridges/+(${cartridges.join('|')})/`, {
    ignore: [`**/cartridges/!(${cartridges.join('|')})/cartridge/**`, '**/node_modules/**']
  });
}

/**
 * Update required path
 * @param {string} filePath - file path
 * @return {string} - return modified required path
 */
function updateRequiredPath(filePath, { isImport, varName } = {}) {
  return !isImport ? `${varName ? (varName + ' = ') : ''}require(${filePath})` : `import ${varName} from ${filePath}`;
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
 * @param {Array} cartridge - cartridges path
 * @param {string} filePath - file path
 * @param {string} locale - locale
 * @return {string} - cleaned path
 */
function getModulePath({ cartridge, filePath, locale }) {
  return path.resolve(`${cartridge}/cartridge/client/${locale}/js`, filePath);
}

/**
 * Get closest module path
 * @param {Array} cartridges cartridges
 * @param {string} filePath file path
 * @returns {string} module path
 */
function getClosestModulePath({ cartridges, filePath, locale }) {
  let ret = '';

  for (let i = 0; i < cartridges.length; i++) {
    const cartridgeName = cartridges[i];
    const cartridge = getCartridgePath(cartridgeName, cartridgePaths);
    const modulePath = getModulePath({ cartridge, filePath, locale });
    const isModuleExist = checkExist(modulePath);

    if (isModuleExist) {
      ret = modulePath;
      break;
    }
  }

  return ret;
}

module.exports = function loader(source) {
  let src = source;

  const options = loaderUtils.getOptions(this);

  validateOptions(schema, options, 'sfra module loader');

  if (!options.alias) {
    options.alias = {};
  }

  const rmark = new RegExp(`^(?:(\\*)|(\\.)|((?:${Object.keys(options.alias).join('|')}):?))`);
  let cartridges = options.cartridges || [];
  let cache = options.cache;
  let cartridgeMatcher = rcartridge.exec(this.resourcePath.replace(/\\/g, path.sep));
  const isNodeModule = this.resourcePath.indexOf('node_modules') !== -1;

  if (cache !== false) {
    cache = true;
  }

  if (!options.context) {
    options.context = path.resolve(this.rootContext, '../');
  }

  if (typeof cartridges === 'string') {
    cartridges = cartridges.split(':');
  }

  if (!isNodeModule && cartridges.length && cartridgeMatcher) {
    const [, curCartridge, locale, curFilePath] = cartridgeMatcher;

    if (!cartridgePaths || !cache) {
      cartridgePaths = findCartridgePaths(options.context, cartridges);
    }

    if (cartridgePaths.length) {
      if (src.includes('module.superModule')) {
        const modulePath = getClosestModulePath({
          cartridges: cartridges.slice(cartridges.indexOf(curCartridge) + 1),
          filePath: curFilePath,
          locale
        });

        src = `module.superModule = ${modulePath ? updateRequiredPath(loaderUtils.stringifyRequest(this, modulePath)) : null};\n${src}`;
      }

      src = src.replace(rpath, (full, m1, m2, m3, m4) => {
        const p1 = cleanPath(m2);
        const p3 = cleanPath(m4);
        const p = p1 || p3;
        const isImport = !!p3;
        const varName = m1 || (m3 && m3.trim());
        const markerMatcher = rmark.exec(p);
        let reqPath;
        let filePath;

        if (markerMatcher) {
          const marker = markerMatcher[0];
          const isDirect = marker.includes(':');

          switch (marker) {
            case '*':
              filePath = p.slice(2);
              break;
            case '.':
              filePath = `${path.dirname(curFilePath)}/${p}`;
              break;
            default:
              filePath = p.slice(isDirect ? marker.length : marker.length + 1);
          }

          let idx = 0;
          const isSameModule = this.resourcePath.indexOf(filePath) !== -1;

          // is self reference?
          if (isSameModule) {
            idx = cartridges.indexOf(curCartridge) + 1;
          }

          if (marker.includes(':')) {
            idx = cartridges.indexOf(options.alias[marker.split(':')[0]]);
          }

          const modulePath = getClosestModulePath({
            cartridges: cartridges.slice(idx),
            filePath,
            locale
          });

          reqPath = updateRequiredPath(loaderUtils.stringifyRequest(this, modulePath || full), {
            isImport,
            varName
          });

          return reqPath;
        }

        return full;
      });
    }
  }
console.log(src, this.resourcePath)
  return src;
};
