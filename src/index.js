const path = require('path');
const glob = require('glob');
const loaderUtils = require('loader-utils');
const validateOptions = require('schema-utils');
const schema = require('./options.json');
const checkExist = require('./lib/checkExist');

const rpath = /([\w_$]*)[\s=]*require\(([^()]+)\)|import(.*)from\s*([^;\t\r\n\s]+)/g;
const rquote = /['"]/g;
const rcartridge = /cartridges\/([^/]+)\/.+\/js\/(.*)/;

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
 * @param {string} filePath - file path
 * @param {Array} cartridge - cartridges path
 * @return {string} - cleaned path
 */
function getModulePath({ cartridge, filePath }) {
    return path.resolve(`${cartridge}/cartridge/client/default/js/`, filePath);
}

/**
 * Get closest module path
 * @param {Array} cartridges cartridges
 * @param {string} filePath file path
 * @returns {string} module path
 */
function getClosestModulePath(cartridges, filePath) {
    for (let i = 0; i < cartridges.length; i++) {
        const cartridgeName = cartridges[i];
        const cartridge = getCartridgePath(cartridgeName, cartridgePaths);
        const modulePath = getModulePath({ cartridge, filePath });
        const isModuleExist = checkExist(modulePath);

        if (isModuleExist) {
            return modulePath;
        }
    }

    return '';
}

module.exports = function loader(source) {
    let src = source;

    const options = loaderUtils.getOptions(this);

    validateOptions(schema, options, 'sfra module loader');

    if (!options.alias) {
        options.alias = {};
    }

    const rmark = new RegExp(`^(?:(\\*)|(\\.)|(${Object.keys(options.alias).join('|')}))`);
    let cartridges = options.cartridges || [];
    let cache = options.cache;
    let cartridgeMatcher = rcartridge.exec(this.resourcePath);
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
        const [, curCartridge, curFilePath] = cartridgeMatcher;

        if (!cartridgePaths || !cache) {
            cartridgePaths = findCartridgePaths(options.context, cartridges);
        }


        if (cartridgePaths.length) {
            if (src.includes('module.superModule')) {
                const modulePath = getClosestModulePath(cartridges.slice(cartridges.indexOf(curCartridge) + 1), curFilePath);

                if (modulePath) {
                    src = `module.superModule = ${updateRequiredPath(loaderUtils.stringifyRequest(this, modulePath))};\n${src}`;
                }
            }

            src = src.replace(rpath, (full, m1, m2, m3, m4) => {
                const p1 = cleanPath(m2);
                const p3 = cleanPath(m4);
                const p = p1 || p3;
                const isImport = !!p3;
                const varName = m1 || (m3 && m3.trim());
                const marker = rmark.exec(p);
                let reqPath;
                let filePath;

                if (marker) {
                    switch (marker[0]) {
                        case '*':
                            filePath = p.slice(2);
                            break;
                        case '.':
                            filePath = `${path.dirname(curFilePath)}/${p}`;
                            break;
                        default:
                            filePath = p.slice(marker[0].length + 1);
                    }

                    let idx = 0;
                    const isSameModule = this.resourcePath.indexOf(filePath) !== -1;

                    // is self reference?
                    if (isSameModule) {
                        idx = cartridges.indexOf(curCartridge) + 1;
                    }

                    const modulePath = getClosestModulePath(cartridges.slice(idx), filePath);

                    if (modulePath) {
                        reqPath = updateRequiredPath(loaderUtils.stringifyRequest(this, modulePath), {
                            isImport,
                            varName
                        });
                    }

                    return reqPath;
                }

                return full;
            });
        }
    }

    return src;
};
