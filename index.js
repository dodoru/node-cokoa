const path = require('path');
const Koa = require('koa');
const koaSession = require('koa-session');
const koaBodyParser = require('koa-bodyparser');
const colib = require('node-web-common');

const contextMsg = (ctx) => `${ctx.res.statusCode} ${ctx.req.method} ${ctx.originalUrl} - userid:${ctx.session.userid}`;

const stateError = (ctx, error) => {
    const errno = error.errno;
    const status = (errno > 40000 && errno < 60000) ? parseInt(errno / 100) : 400;
    ctx.status = error.status || status;
    ctx.body = {
        error: `[${error.tag}] ${error.message}.`,
        code: errno,
    };
};

const handleApiError = async (ctx, next) => {
    const logger = global.logger || console;
    const logSentry = global.logSentry;
    const ignoreErrnos = global.ignoreErrnos || new Set([]);
    try {
        await next();
        logger.info(contextMsg(ctx))
    } catch (error) {
        let err = colib.api_exceptions.ApiError.init(error);
        let msg = contextMsg(ctx);
        if (ctx.req.method !== 'GET') {
            msg += `\n[request]: ${ctx.request.body} \n[response]: ${err.errno}, ${err.message}`;
        } else {
            msg += `\n[response]: ${err.errno}, ${err.message}`;
        }
        stateError(ctx, err);
        logger.error(msg);
        if (logSentry instanceof Function && !ignoreErrnos.has(error.errno)) {
            logger.error('[logSentry]', err);
            error.message += `\n${msg}`;
            logSentry(error);
        }
    }
};

const appFactory = (options) => {
    const name = colib.cofile.parseFilePath(process.argv[1]).name;
    const opt = {
        name,
        version: '',
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
        logLevel: 'info',
        logfile: '',                        // default logfile
        logFileOptions: {
            maxsize: 10 * 1024 * 1024,      // 10MB
            maxFiles: 5,
            zippedArchive: true,
        },
        logSentry: null,
        ignoreErrnos: [40100, 40300],       // handle in handleApiError
    };
    const config = Object.assign({}, opt, options);
    const app = new Koa();
    app.keys = config.secretKeys;
    app.config = config;

    // global {logger, logSentry, ignoreErrnos}
    const vtag = `${config.name}-${config.version}`;
    process.env.PROJECT_NAME = vtag;

    const logfile = config.logFile || path.join(process.cwd(), `${config.name}_app.log`);
    const logger = colib.colog.Logger(config.logLevel, logfile, config.logFileOptions);
    global.logger = logger;
    if (config.logSentry instanceof Function) {
        global.logSentry = config.logSentry
    }
    if (config.ignoreErrnos instanceof Array) {
        global.ignoreErrnos = new Set(config.ignoreErrnos);
    }

    app.run = () => {
        const local = colib.utils.webUrl(config.service);
        logger.info(`Listening server[${vtag}] on ${local}, PID:${process.pid}`);
        app.listen(config.service.port, config.service.host);
        if (config.service.nginx_url) {
            logger.info('[nginx]:', config.service.nginx_url);
        }
    };

    const sessionMiddleware = koaSession(config.session, app);
    app.use(sessionMiddleware);
    app.use(koaBodyParser());
    app.use(handleApiError);

    return app;
};


module.exports = {
    _depends: {
        Koa,
        koaBodyParser,
        koaSession,
        node_web_common: colib,
    },
    version: require('./package.json').version,
    contextMsg: contextMsg,
    stateError: stateError,
    appFactory: appFactory,
    handleApiError: handleApiError,
};
