<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![deps][deps]][deps-url]
[![tests][tests]][tests-url]

# sfra-module-loader

A saleforce commerce cloud module loader for webpack based on the cartridge path

## Getting Started

To begin, you'll need to install `sfra-module-loader`:

```console
$ npm install sfra-module-loader --save-dev
```

Import (or `require`) the target file(s) in one of the bundle's files in current cartridge:

```js
// bundle file
import mod from '*/component/mod'
```

Then add the loader to your `webpack` config. For example:

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js)$/,
        use: [
          {
            loader: 'sfra-module-loader',
            options: {
              cartridges: [
                'storefront',
                'core'
              ]
            }
          }
        ]
      }
    ]
  }
}
```

And run `webpack` via your preferred method. This will load the first found module in cartridge path.

## Options

### `context`

Type: `String`
Default: [`../`](https://webpack.js.org/configuration/entry-context/#context)

Specifies a cartridges context.

```js
// webpack.config.js
...
{
  loader: 'sfra-module-loader',
  options: {
    cartridges: 'storefront:core',
    context: path.resolve(__dirname, '../')
  }
}
...
```

### `cartridges`

Type: `String|Array`
Default: ``

The cartridge path

```js
// bundle file
import mod from '*/component/mod'
```

```js
// webpack.config.js
...
{
  loader: 'sfra-module-loader',
  options: {
    cartridges: [
      'storefront',
      'core'
    ]
  }
}
...
```

Or using a `String`:

```js
// bundle file
import mod from '*/component/mod'
```

```js
// webpack.config.js
...
{
  loader: 'sfra-module-loader',
  options: {
    cartridges: 'storefront:core'
  }
}
...
```

Loader will scan all cartriges in project repositoty from top most (or left to right) cartridge in cartridge path

### `cache`

Type: `Boolean`
Default: `true`

If `true`, loader will scan and store cartridge location on first run and use them for next run

```js
// webpack.config.js
{
  loader: 'sfra-module-loader',
  options: {
    ...
    cache: true
  }
}
```

### `alias`

Type: `Object`

If configured, loader will replace all request that star with the alias name with closest existing ancestor module   

```js
// webpack.config.js
{
  loader: 'sfra-module-loader',
  options: {
    ...
    alias: {
      core: 'core',
    },
    cartridges: 'storefront:core'
  }
}
```

To driect request to an ancestor module, use colon `:` after alias name (e.g, `core:abc/mod`)

## Examples

The following examples show how one might use `sfra-module-loader` and what the result
would be.

```js
// /core/js/components/mod.js 
export default () => {
  console.log('module from core');
}
```

```js
// /pluggin/js/components/mod.js 
const baseModule = module.superModule; // -> /core/js/components/mod.js

export default () => {
  baseModule();

  console.log('module from pluggin');
}
```

```js
// /storefront/main.js
import mod1 from '*/components/mod' // -> /pluggin/js/components/mod.js
import mod2 from 'core/components/mod' // -> /pluggin/js/components/mod.js
import mod3 from 'core:components/mod' // -> /core/js/components/mod.js

export default () => {
  mod();
  mod1();
  mod3();
}
```

```js
// webpack.config.js
{
  loader: 'sfra-module-loader',
  options: {
    alias: {
      core: 'core',
    },
    cartridges: 'storefront:core',
    context: path.resolve(__dirname, '../')
  }
}
```

```bash
# result
module from core
```


## Contributing

Contributing is welcome.

[npm]: https://img.shields.io/npm/v/sfra-module-loader.svg
[npm-url]: https://npmjs.com/package/sfra-module-loader

[deps]: https://david-dm.org/haan123/sfra-module-loader.svg
[deps-url]: https://david-dm.org/haan123/sfra-module-loader

[tests]: https://img.shields.io/circleci/project/github/haan123/sfra-module-loader.svg
[tests-url]: https://circleci.com/gh/haan123/sfra-module-loader