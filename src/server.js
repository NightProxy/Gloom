// server.js

import express from 'express';
import request from 'request';
import pkg from 'node-html-parser';
const { parse } = pkg;
import { config } from './config.js';
import { encryptUrl, decryptUrl } from './encrypt.js';
import { handleError } from './error.js';
import { rewriteUrls } from './rewrite.js';
import fs from 'fs';
import path from 'path';

export async function createGloomServer() {
  const app = express();

  // Dynamically load and apply middleware from the ./src/middleware directory
  const middlewarePath = path.join(process.cwd(), 'src', 'middleware');
  const files = fs.readdirSync(middlewarePath);
  for (const file of files) {
    const middleware = await import(path.join(middlewarePath, file));
    if (typeof middleware.default === 'function') {
      app.use(middleware.default);
    }
  }

  // Middleware to decrypt URLs
  // Middleware to decrypt URLs
  app.use(config.prefix, (req, res, next) => {
    let path = req.path.slice(config.prefix.length + 1); // Remove the prefix and the leading slash
    let url = decodeURIComponent(path); // Decode the URL
    try {
      req.proxiedUrl = decryptUrl(url);
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
        rewriteUrls(root, config.prefix, (url) => encryptUrl(url));
        res.end(root.toString());
      } else {
        res.end(body);
      }
    });
  });

  return app;
}
