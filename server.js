const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  server.requestTimeout = 0;
  server.headersTimeout = 120_000;
  server.keepAliveTimeout = 60_000;

  server.listen(port, () => {
    console.log(
      `> Ready on http://localhost:${port} (NODE_ENV=${process.env.NODE_ENV ?? "development"})`
    );
  });
});
