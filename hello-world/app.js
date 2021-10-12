const axios = require("axios");
const log = require("lambda-log");
const { metricScope, Unit } = require("aws-embedded-metrics");
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
  log.info("Starting request", { event, context });

  const urlWithParams =
    url +
    event.queryStringParameters.code +
    "?sleep=" +
    event.queryStringParameters.sleep;

  metrics.setNamespace("yt-backend");
  metrics.putDimensions({ url: urlWithParams });
  metrics.setProperty("RequestId", context.requestId);

  try {
    log.info("calling", { urlWithParams });
    const ret = await axios(urlWithParams);

    log.info("fetched", { duration: ret.duration, url: url });

    log.info("embedded metric format BABY!", {
      duration: ret.duration,
      functionName: context.functionName,
      url: urlWithParams,
      _aws: {
        Timestamp: new Date().getTime(),
        CloudWatchMetrics: [
          {
            Namespace: "ytemf",
            Dimensions: [["functionName", "url"]],
            Metrics: [
              {
                Name: "duration",
                Unit: "Milliseconds",
              },
            ],
          },
        ],
      },
    });
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: ret.data,
      }),
    };

    metrics.putMetric(ret.status, ret.duration, Unit.Milliseconds);
  } catch (error) {
    log.error(error);
    metrics.putMetric(error.response.status, error.duration, Unit.Milliseconds);

    response = {
      statusCode: error.response.status,
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
  return response;
});
