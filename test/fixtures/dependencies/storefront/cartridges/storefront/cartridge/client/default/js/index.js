import core from '*/core';
const pluggin = require('pluggin:pluggin'); // direct request
const dump = require('dump');
const dump2 = require('./dump2');

export default () => {
  core();
  pluggin();
};
