# node-cokoa
---
develop koa web app with node-web-common

## dependencies
```

koa=^2.5.3
koa-bodyparser=^4.2.1
koa-session=^5.9.0
node-web-common=0.0.2

node-web-common
    - bluebird=^3.5.2
    - co=^4.6.0
    - mz=^2.7.0
    - winston=^2.4.0

```

## Install
```shell
npm install node-cokoa
```

## Usage
```js
const cokoa = require('node-cokoa');

function test_koa_app() {
    const app = cokoa.appFactory({name: 'KoaWeb', version: 'v0.0.1'});
    app.run();
}

test_koa_app();

```