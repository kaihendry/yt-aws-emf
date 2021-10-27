const axios = require("axios");
const log = require("lambda-log");
const { metricScope, Unit, Configuration } = require("aws-embedded-metrics");
Configuration.debuggingLoggingEnabled = true;
Configuration.namespace = "yt-emf1";

log.options.tagsKey = null;
log.options.levelKey = "level";
const url = "https://httpstat.us/";
let response;

axios.interceptors.request.use(
  function (config) {
    config.metadata = { startTime: new Date() };
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  function (response) {
    response.config.metadata.endTime = new Date();
    response.duration =
      response.config.metadata.endTime - response.config.metadata.startTime;
    return response;
  },
  function (error) {
    error.config.metadata.endTime = new Date();
    error.duration =
      error.config.metadata.endTime - error.config.metadata.startTime;
    return Promise.reject(error);
  }
);
exports.lambdaHandler = metricScope((metrics) => async (event, context) => {
  log.info("Starting request", { context });

  // Issue: size doesn't work!
  metrics.putMetric("Size", event.body?.length, Unit.Bytes);

  const urlWithParams =
    url +
    (event.queryStringParameters?.code || 200) +
    "?sleep=" +
    (event.queryStringParameters?.sleep || 0);

  console.log(urlWithParams);

  try {
    const ret = await axios(urlWithParams);
    log.info("called", { urlWithParams, duration: ret.duration });

    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: ret.data,
      }),
    };

    metrics.setDimensions({
      url: urlWithParams,
      status: ret.status.toString(),
    });

    metrics.putMetric("Success", ret.duration, Unit.Milliseconds);
  } catch (error) {
    log.error(error);
    metrics.setDimensions({
      url: urlWithParams,
      status: error.response.status.toString(),
    });
    metrics.putMetric("Error", error.duration, Unit.Milliseconds);
    response = {
      statusCode: error.response.status,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
  return response;
});
