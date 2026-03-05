const serverless = require("serverless-http");
const app = require("../../server");

exports.handler = serverless(app, {
  request: (req, event) => {
    if (typeof event?.body === "string") {
      req.rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf8")
        : event.body;
    }
  },
});
