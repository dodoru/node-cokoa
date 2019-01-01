const cokoa = require('./index');

function testMain() {
    const appConfig = cokoa.appConfig;
    console.log('default:', appConfig.name, appConfig.version)
    const app = cokoa.appFactory({name: 'MyKoaApp', version: 'v0.0.1'});
    console.log('custom AppConfig:', appConfig.name, appConfig.version)

    app.run();
}

testMain();
