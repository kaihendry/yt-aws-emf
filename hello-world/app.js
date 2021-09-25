const axios = require("axios");
const log = require("lambda-log");
log.options.tagsKey = null;
log.options.levelKey = "level";
const url = "http://checkip.amazonaws.com/";
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

exports.lambdaHandler = async (event, context) => {
  try {
    const ret = await axios(url);

    log.info("fetched", { duration: ret.duration, url: url });

    log.info("embedded metric format BABY!", {
      duration: ret.duration,
      functionName: context.functionName,
      hostname: new URL(url).hostname,
      _aws: {
        Timestamp: new Date().getTime(),
        CloudWatchMetrics: [
          {
            Namespace: "ytemf",
            Dimensions: [["functionName", "hostname"]],
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
        message: "hello world",
      }),
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};
