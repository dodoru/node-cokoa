const Koa = require('koa');
const koaSession = require('koa-session');
const koaBodyParser = require('koa-bodyparser');
const colib = require('node-web-common');
const appConfig = require('./app_config');

const appFactory = (options) => {
    // override $config by $options
    Object.assign(appConfig, options);
    const app = new Koa();
    app.keys = appConfig.secretKeys;
    app.config = appConfig;

    // global logger
    const logger = colib.colog.Logger(appConfig.logLevel, appConfig.logFile, appConfig.logFileOptions);
    global.logger = logger;

    app.run = () => {
        const local = colib.utils.webUrl(appConfig.service);
        logger.info(`run server [${appConfig.name}-${appConfig.version}] , PID:${process.pid}`);
        logger.info(`listening on ${local} ...`);
        app.listen(appConfig.service.port, appConfig.service.host);
        if (appConfig.service.nginx_url) {
            logger.info('[nginx]:', appConfig.service.nginx_url);
        }
    };

    const sessionMiddleware = koaSession(appConfig.session, app);
    app.use(sessionMiddleware);
    app.use(koaBodyParser());
    app.use(handleApiError);

    return app;
};

const stateError = (ctx, error) => {
    // $error: instance of colib.api_exceptions.ApiError
    const errno = error.errno;
    const status = (errno > 40000 && errno < 60000) ? parseInt(errno / 100) : 400;
    ctx.status = error.status || status;
    ctx.body = {
        error: `[${error.tag}] ${error.message}.`,
        code: errno,
    };
};

const contextMsg = (ctx, session_key = "user_id") => {
    let msg = `${ctx.res.statusCode} ${ctx.req.method} ${ctx.originalUrl}`;
    if (session_key) {
        msg += ` - ${session_key}:${ctx.session[session_key]}`
    }
    let flag = Boolean(ctx.body.error);
    if (ctx.req.method === 'GET') {
        flag = flag || !appConfig.ignoreApiGetSuccess;
    } else {
        msg += `\n[request]: ${ctx.request.body}`;
        flag = flag || !appConfig.ignoreApiSetSuccess;
    }
    if (flag) {
        msg += `\n[response]: ${JSON.stringify(ctx.body)}\n`;
    }
    return msg;
}

const logError = (error, extra_msg = '') => {
    const ignoreErrnos = new Set(appConfig.ignoreSentryErrnos);
    const is_ignored = ignoreErrnos.has(error.errno)
    if (is_ignored) {
        global.logger.info(error)
    } else {
        global.logger.error(error)
        if (appConfig.logSentry instanceof Function) {
            error.message += `\n${extra_msg}`;
            appConfig.logSentry(error);
        }
    }
}

const handleApiError = async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        const err = colib.api_exceptions.ApiError.init(error);
        stateError(ctx, err);
        logError(error);
    }
    global.logger.info(contextMsg(ctx))
};


module.exports = {
    _depends: {
        Koa,
        koaBodyParser,
        koaSession,
        node_web_common: colib,
    },
    appConfig: appConfig,
    appFactory: appFactory,
    logError: logError,
    contextMsg: contextMsg,
    stateError: stateError,
    handleApiError: handleApiError,
};
