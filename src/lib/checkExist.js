/**
 * Clear require cache
 * @param {string} p - module path
 * @param {string} req - require object (passed as argument for testing)
 * @return {boolean} - return true if module is deleted
 */
export function invalidateRequire(p, req) {
  const keys = Object.keys(req.cache);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (key.indexOf(p) !== -1) {
      delete req.cache[key];
      return true;
    }
  }

  return false;
}

export default (mod) => {
  try {
    require.resolve(mod);

    // Remove cached copy for future checks
    invalidateRequire(mod, require);
  } catch (err) {
    return false;
  }

  return true;
};
