const axios = require("axios");
const log = require("lambda-log");
const { metricScope, Unit } = require("aws-embedded-metrics");
log.options.tagsKey = null;
log.options.levelKey = "level";
const url = "https://httpstat.us/";
let response;

axios.interceptors.request.use(
  function (config) {
    config.metadata = {
      startTime: new Date(),
    };
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
  log.info(event);

  try {
    urlWithParams =
      url +
      event.queryStringParameters.code +
      "?sleep=" +
      event.queryStringParameters.sleep;

    metrics.setNamespace(context.functionName);
    metrics.putDimensions({ url: urlWithParams });
    metrics.setProperty("RequestId", context.requestId);

    log.info("calling", urlWithParams);
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
    metrics.putMetric("Success", 1, Unit.Count);
  } catch (err) {
    log.error(err);
    metrics.putMetric("Error", 1, Unit.Count);
    return err;
  }

  return response;
});
