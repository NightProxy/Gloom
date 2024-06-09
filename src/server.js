import url from 'url';
import path from 'path';
import pkg from 'node-html-parser';
const { parse } = pkg;
import { config } from './config.js';
import { encryptUrl, decryptUrl } from './encrypt.js';
import { handleError } from './error.js';
import { rewriteUrls } from './rewrite.js';
import fs from 'fs';
import fetch from 'node-fetch';
import contentType from 'content-type';
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
    var reqPath = reqUrl.pathname.slice(config.prefix.length);
    var decodedUrl = decodeURIComponent(reqPath);
    var proxiedUrl = decryptUrl(decodedUrl);

    if (reqUrl.pathname.startsWith(`/${config.prefix}/middleware/`)) {
      console.log(`Received request for ${req.url}`);
      console.log(`Decoded URL: ${decodedUrl}`);
      console.log(`Proxied URL: ${proxiedUrl}`);
      var middlewarePath = path.join(process.cwd(), 'src/middleware', reqUrl.pathname.slice(`/${config.prefix}/middleware/`.length));
      console.log(middlewarePath);
      fs.readFile(middlewarePath, (err, data) => {
        handleError(err, req, res)

        res.writeHead(200);
        res.end(data);
      });
    }
    if (reqUrl.pathname.startsWith(config.prefix)) {
      if (config.proxy.method == "fetch") {
        console.log(`Received request for ${req.url}`);
        // Extract the part of the URL after the prefix
        let pathAfterPrefix = reqUrl.pathname.slice(config.prefix.length);
        // Decode the URL
        let decodedUrl;
        try {
          decodedUrl = decodeURIComponent(pathAfterPrefix);
        } catch (err) {
          console.error(`Failed to decode URL: ${err}`);
          if (!res.headersSent) {
            handleError(err, req, res);
          }
          return;
        }

        // Decrypt the URL
        let proxiedUrl;
        try {
          proxiedUrl = decryptUrl(decodedUrl);
        } catch (err) {
          console.error(`Failed to decrypt URL: ${err}`);
          if (!res.headersSent) {
            handleError(err, req, res);
          }
          return;
        }

        console.log(`Decoded URL: ${decodedUrl}`);
        console.log(`Proxied URL: ${proxiedUrl}`);

        try {
          const asset_url = new URL(proxiedUrl);
          const asset = await fetch(asset_url); // Get the asset from the website

          if (!asset.ok) {
            console.error(`Failed to fetch asset: ${asset.status} ${asset.statusText}`);
            if (!res.headersSent) {
              handleError(new Error(`Failed to fetch asset: ${asset.status} ${asset.statusText}`), req, res);
            }
            return;
          }

          const contentTypeHeader = asset.headers.get('content-type');
          const parsedContentType = contentTypeHeader ? contentType.parse(contentTypeHeader).type : '';

          res.writeHead(asset.status, {
            "Content-Type": parsedContentType,
          });

          if (parsedContentType.includes('text/html')) {
            const body = await asset.text();
            const root = parse(body);
            console.log(root);
            rewriteUrls(root, config.prefix, (url) => encryptUrl(url));
            const files = fs.readdirSync(path.join(process.cwd(), 'src/middleware'));
            const scriptTags = files.map(file => `<script src="/${config.prefix}/middleware/${file}"></script>`).join('\n');
            const bodyElement = root.querySelector('body');
            if (bodyElement) {
              bodyElement.insertAdjacentHTML('beforeend', scriptTags);
            }

            res.end(root.toString());
          } else {
            res.end(Buffer.from(await asset.arrayBuffer())); // Write the asset to the response
          }
        } catch (error) {
          console.error(`Error handling request: ${error}`);
          if (!res.headersSent) {
            handleError(error, req, res);
          }
        }
      } else if (config.proxy.method == "HPM") {
        console.log(`Received request for ${req.url}`);
        try {
          httpProxyMiddleware(req, res);
        } catch (error) {
          console.error(`Error in HPM method: ${error}`);
          if (!res.headersSent) {
            handleError(error, req, res);
          }
        }
      } else if (config.proxy.method === 'httpProxy') {
        console.log(`Received request for ${req.url}`);
        try {
          const proxy = httpProxy.createProxyServer({});
          proxy.web(req, res, { target: proxiedUrl });
        } catch (error) {
          console.error(`Error in httpProxy method: ${error}`);
          if (!res.headersSent) {
            handleError(error, req, res);
          }
        }
      }
    }
  });

  return server;
}
