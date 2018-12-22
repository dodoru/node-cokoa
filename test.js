const cokoa = require('./index');

function testMain() {
    const appConfig = cokoa.appConfig;
    console.log('default:', appConfig.name, appConfig.version)
    const app = cokoa.appFactory({name: 'KoaWeb', version: 'v0.0.1'});
    app.run();

    console.log('custom :', appConfig.name, appConfig.version)
}

testMain();
