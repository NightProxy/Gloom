// server.js

const express = require('express');
const request = require('request');
const { parse } = require('node-html-parser');
const { config } = require('./config.js');
const { encryptUrl, decryptUrl } = require('./encrypt');
const { handleError } = require('./error');
const { rewriteUrls } = require('./rewrite');
const fs = require('fs');
const path = require('path');

function createGloomServer() {
  const app = express();

  // Dynamically load and apply middleware from the ./src/middleware directory
  const middlewarePath = path.join(__dirname, 'src', 'middleware');
  fs.readdirSync(middlewarePath).forEach(file => {
    const middleware = require(path.join(middlewarePath, file));
    if (typeof middleware === 'function') {
      app.use(middleware);
    }
  });

  // Middleware to decrypt URLs
  app.use(config.prefix, (req, res, next) => {
    let path = req.path.slice(config.prefix.length); // Remove the prefix
    try {
      req.proxiedUrl = decryptUrl(path, config.encryption);
      next();
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // Middleware to handle requests and rewrite URLs
  app.use(config.prefix, (req, res) => {
    request({ uri: req.proxiedUrl, encoding: null }, (error, response, body) => {
      if (error) {
        return handleError(error, req, res);
      }

      res.writeHead(response.statusCode, response.headers);

      if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
        const root = parse(body.toString());
        rewriteUrls(root, config.prefix, (url) => encryptUrl(url, config.encryption));
        res.end(root.toString());
      } else {
        res.end(body);
      }
    });
  });

  return app;
}

module.exports = { createGloomServer };