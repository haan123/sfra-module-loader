const component = require('*/component');
const pluggin = require('*/pluggin');

export default function () {
  component();
  pluggin();

  return 'client component';
};
