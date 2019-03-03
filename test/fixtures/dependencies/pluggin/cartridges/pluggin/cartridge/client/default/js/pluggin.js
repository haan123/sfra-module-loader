const dump = module.superModule;
const component = require('./component');

module.exports = function () {
  component();

  return 'pluggin';
};
