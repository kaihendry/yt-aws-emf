const axios = require("axios");
const log = require("lambda-log");

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

exports.lambdaHandler = async function (event, context) {
  log.info("Starting request", { context });

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

    log.info("response", {
      status: ret.status,
      duration: ret.duration,
      functionName: context.functionName,
      hostname: new URL(url).hostname,
      _aws: {
        Timestamp: new Date().getTime(),
        CloudWatchMetrics: [
          {
            Namespace: "ytemf-backend",
            Dimensions: [["hostname", "functionName"]],
            Metrics: [
              {
                Name: "duration",
                Unit: "Milliseconds",
              },
			  {
                Name: "status",
              },
            ],
          },
        ],
      },
    });
  } catch (error) {
    log.error(error, {
      status: error.response.status,
      duration: error.duration,
      functionName: context.functionName,
      hostname: new URL(url).hostname,
      _aws: {
        Timestamp: new Date().getTime(),
        CloudWatchMetrics: [
          {
            Namespace: "ytemf-backend",
            Dimensions: [["hostname", "functionName"]],
            Metrics: [
              {
                Name: "duration",
                Unit: "Milliseconds",
              },
			 {
                Name: "status",
              },
            ],
          },
        ],
      },
    });
    response = {
      statusCode: error.response.status.toString(),
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
  return response;
};
