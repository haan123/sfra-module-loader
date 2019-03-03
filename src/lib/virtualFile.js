const path = require('path');

const NS = __filename;
const VIRTUAL_STAT = {
    dev: 8675309,
    nlink: 1,
    uid: 501,
    gid: 20,
    rdev: 0,
    blksize: 4096,
    ino: 44700000,
    mode: 33188,
    isFile() { return true; },
    isDirectory() { return false; },
    isBlockDevice() { return false; },
    isCharacterDevice() { return false; },
    isSymbolicLink() { return false; },
    isFIFO() { return false; },
    isSocket() { return false; }
};

/**
 * Create patch function
 * @param {object} fs file system
 * @param {string} name file method name
 * @param {function} fn callback
 */
function createPatchFn(fs, name, fn) {
    const origin = fs[name];

    fs[name] = function () {
        const args = Array.prototype.slice.call(arguments);
        return fn.apply(this, [origin, args].concat(args));
    };
}

/**
 * Patch the file system
 * @param {object} fs file system
 */
function patch(fs) {
    if (fs[NS]) return;

    const virtualFS = {
        files: {},

        add(options) {
            const file = path.resolve(options.path);

            virtualFS.files[file] = {
                path: file,
                content: options.content
            };
        }

    };

    fs[NS] = virtualFS;

    createPatchFn(fs, 'readFile', function (orig, args, file, encoding, cb) {
        const rFile = path.resolve(file);
        const vFile = virtualFS.files[rFile];

        if (vFile) {
            if (typeof (encoding) === 'function') {
                cb = encoding;
                encoding = null;
            }

            let content = vFile.content;

            if (encoding) {
                content = content.toString(encoding);
            }

            cb(null, content);

            return null;
        }

        return orig.apply(this, args);
    });

    createPatchFn(fs, 'readFileSync', function (orig, args, file, encoding) {
        const rFile = path.resolve(file);
        const vFile = virtualFS.files[rFile];

        if (vFile) {
            let content = vFile.content;

            if (encoding) {
                content = content.toString(encoding);
            }

            return content;
        }
        return orig.apply(this, args);
    });

    createPatchFn(fs, 'stat', function (orig, args, p, cb) {
        const rp = path.resolve(p);
        const vFile = virtualFS.files[rp];

        if (vFile) {
            const vStat = Object.assign({}, VIRTUAL_STAT, {
                size: vFile.content.length
            });

            cb(null, vStat);

            return null;
        }

        return orig.apply(this, args);
    });

    createPatchFn(fs, 'statSync', function (orig, args, p) {
        const rp = path.resolve(p);
        const vFile = virtualFS.files[rp];

        if (vFile) {
            const vStat = Object.assign({}, VIRTUAL_STAT, {
                size: vFile.content.length
            });

            return vStat;
        }

        return orig.apply(this, args);
    });
}

module.exports = function (context, file, content) {
    const fs = context.fs;

    const src = Buffer.from(content, 'utf8');

    patch(fs);

    fs[NS].add({
        path: file,
        content: src
    });

    return file.replace(/\\/g, '/');
};
