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
    const logger = colib.logging.Logger(appConfig.logLevel, appConfig.logFile, appConfig.logFileOptions);
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


const contextMsg = (ctx) => {
    // fmt: `${status} ${method} ${path} <- ${logSessionKey}=${session[${logSessionKey}]}>
    let msg = `${ctx.res.statusCode} ${ctx.req.method} ${ctx.originalUrl}`;
    if (appConfig.logSessionKey) {
        msg += ` - ${appConfig.logSessionKey}:${ctx.session[appConfig.logSessionKey]}`
    }
    let is_ignored;
    if (ctx.req.method === 'GET') {
        is_ignored = appConfig.ignoreApiGetSuccess;
    } else {
        msg += `\n[request]: ${ctx.request.body}`;
        is_ignored = appConfig.ignoreApiSetSuccess;
    }
    if (ctx.responseErrno || !is_ignored) {
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
        const err = colib.api_exceptions.ApiError.new(error);
        const {status, errno, message} = err.responseData();
        ctx.responseErrno = errno;
        ctx.status = status;
        ctx.body = {
            error: message,
            code: errno,
        }
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
    handleApiError: handleApiError,
};
