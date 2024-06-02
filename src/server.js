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

export async function createGloomServer(server) {
  server.on('request', async (req, res) => {
    const reqUrl = url.parse(req.url, true);

    // Check if the request is for a middleware file
    if (reqUrl.pathname.startsWith(`/${config.prefix}/middleware/`)) {
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
      let path = reqUrl.pathname.slice(config.prefix.length); // Remove the prefix and the leading slash
      let decodedUrl = decodeURIComponent(path); // Decode the URL

      try {
        let proxiedUrl = decryptUrl(decodedUrl);
        const response = await fetch(proxiedUrl);
        const body = await response.text();

        res.writeHead(response.status, response.headers.raw());

        if (response.headers.get('content-type') && response.headers.get('content-type').includes('text/html')) {
          const root = parse(body);
          rewriteUrls(root, config.prefix, (url) => encryptUrl(url));

          // Inject the script tags for the middleware JavaScript files
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
    }
  });

  return server;
}