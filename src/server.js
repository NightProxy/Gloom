import url from 'url';
import pkg from 'node-html-parser';
const { parse } = pkg;
import { config } from './config.js';
import { encryptUrl, decryptUrl } from './encrypt.js';
import { handleError } from './error.js';
import { rewriteUrls } from './rewrite.js';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { createProxyMiddleware } from 'http-proxy-middleware';
import httpProxy from 'http-proxy';

export async function createGloomServer(server) {
  var httpProxyMiddleware = createProxyMiddleware({
    target: '',
    changeOrigin: true,
    pathRewrite: {
      [`^/${config.prefix}`]: '',
    },
    router: function (req) {
      const reqUrl = url.parse(req.url, true);
      const path = reqUrl.pathname.slice(config.prefix.length);
      const decodedUrl = decodeURIComponent(path);
      const proxiedUrl = decryptUrl(decodedUrl);
      console.log(`Decoded URL: ${decodedUrl}`);
      console.log(`Proxied URL: ${proxiedUrl}`);
      return proxiedUrl; // return new target host
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying request to: ${proxyReq.getHeader('host')}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`Received response with status: ${proxyRes.statusCode}`);
    }
  });

  server.on('request', async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    var path = reqUrl.pathname.slice(config.prefix.length);
    var decodedUrl = decodeURIComponent(path);
    var proxiedUrl = decryptUrl(decodedUrl);

    if (reqUrl.pathname.startsWith(`/${config.prefix}/middleware/`)) {
      console.log(`Received request for ${req.url}`);
      console.log(`Decoded URL: ${decodedUrl}`);
      console.log(`Proxied URL: ${proxiedUrl}`);
      var middlewarePath = path.join(process.cwd(), 'src/middleware', reqUrl.pathname.slice(`/${config.prefix}/middleware/`.length));
      console.log(middlewarePath);
      fs.readFile(middlewarePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end(JSON.stringify(err));
          return;
        }

        res.writeHead(200);
        res.end(data);
      });
    } else if (reqUrl.pathname.startsWith(config.prefix)) {
      if (config.proxy.method == "fetch") {
        console.log(`Received request for ${req.url}`);
        console.log(`Decoded URL: ${decodedUrl}`);
        console.log(`Proxied URL: ${proxiedUrl}`);
        try {
          const response = await fetch(proxiedUrl);
          const body = await response.text();

          res.writeHead(response.status, response.headers.raw());

          if (response.headers.get('content-type') && response.headers.get('content-type').includes('text/html')) {
            const root = parse(body);
            const test = rewriteUrls(root, config.prefix, (url) => encryptUrl(url));
            console.log(test);
            const files = fs.readdirSync(middlewarePath);
            const scriptTags = files.map(file => `<script src="/${config.prefix}/middleware/${file}"></script>`).join('\n');
            const bodyElement = root.querySelector('body');
            if (bodyElement) {
              bodyElement.insertAdjacentHTML('beforeend', scriptTags);
            }

            res.end(root.toString());
          } else {
            res.end(body);
          }
        } catch (error) {
          handleError(error, req, res);
        }
      } else if (config.proxy.method == "httpProxyMiddleware") {
        console.log(`Received request for ${req.url}`);
        try {
          httpProxyMiddleware(req, res);
        } catch (error) {
          handleError(error, req, res);
        }
      } else if (config.proxy.method === 'httpProxy') {
        try {
          const proxy = httpProxy.createProxyServer({});
          proxy.web(req, res, { target: proxiedUrl });
        } catch (error) {
          handleError(error, req, res);
        }
      }
    }
  });

  return server;
}