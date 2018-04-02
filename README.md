# local-messaging

Provides IPC messaging between displays modules and Websocket messaging to Messaging Service.

## Development

Install:

```bash
npm install
```

Unit and integration tests:

```bash
npm run test
```

## Manual testing

Run local messaging:

```bash
NODE_ENV=manual node src/index.js --debug
```

In another terminal window, clone and run another module. For example, to
run the logging module:

```bash
git clone https://github.com/Rise-Vision/logging-module.git
npm install
node src/index.js
```

See the console messages on both terminals to check connectivity between
modules is working well.

## Manual testing with proxy

Get the URL of a configured HTTP proxy. For quick tests in Ubuntu installing
[tinyproxy](https://tinyproxy.github.io/) is a good option.

Then run local messaging with the HTTP_PROXY environment variables set:

```bash
HTTP_PROXY=http://localhost:8888 HTTPS_PROXY=http://localhost:8888 node src/index.js
```
