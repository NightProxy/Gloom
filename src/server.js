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
  const gloom = express();

  // Serve the JavaScript files from the middleware directory
  gloom.use(config.prefix + '/middleware', express.static(path.join(process.cwd(), 'src', 'middleware')));

  // Middleware to decrypt URLs
  gloom.use(config.prefix, (req, res, next) => {
    let path = req.path.slice(config.prefix.length + 1); // Remove the prefix and the leading slash
    let url = decodeURIComponent(path); // Decode the URL
    try {
      req.proxiedUrl = decryptUrl(url);
      request({ uri: req.proxiedUrl, encoding: null }, (error, response, body) => {
        if (error) {
          return handleError(error, req, res);
        }
  
        res.writeHead(response.statusCode, response.headers);
  
        if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
          const root = parse(body.toString());
          rewriteUrls(root, config.prefix, (url) => encryptUrl(url));
  
          // Inject the script tags for the middleware JavaScript files
          const middlewarePath = path.join(process.cwd(), 'src', 'middleware');
          const files = fs.readdirSync(middlewarePath);
          const scriptTags = files.map(file => `<script src="/middleware/${file}"></script>`).join('\n');
          const bodyElement = root.querySelector('body');
          if (bodyElement) {
            bodyElement.insertAdjacentHTML('beforeend', scriptTags);
          }
  
          res.end(root.toString());
        } else {
          res.end(body);
        }
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  return gloom;
}