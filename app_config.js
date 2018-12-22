const pkg = require('./package.json')

const appConfig = {
    name: pkg.name,
    version: pkg.version,
    secretKeys: ['Koa-App-${SecretKey}'],
    session: {
        key: 'SESSION1',      // cookie key (default is koa:sess)
        maxAge: 31536000000,  // maxAge in ms, 1 year (default is 1 day)
        overwrite: true,      // can overwrite or not (default true)
        httpOnly: true,       // httpOnly or not (default true)
        signed: true,         // signed or not (default true)
    },
    service: {
        scheme: "http",
        host: "localhost",
        port: 8080,
        nginx_url: null,
    },
    // LOGGING:
    logLevel: 'info',
    logFile: `${process.cwd()}/app.log`,
    logFileOptions: {
        // default maxsize is 10MB
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
        zippedArchive: true,
    },
    logSentry: null,
    ignoreSentryErrnos: [40100, 40300, 40400],
}


module.exports = appConfig;

