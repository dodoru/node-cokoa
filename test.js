const cokoa = require('./index');

function testMain() {
    const app = cokoa.appFactory({name: 'KoaWeb', version: 'v0.0.1'});
    app.run();
}

testMain();
