import url from 'url';
import path from 'path';
import pkg from 'node-html-parser';
const { parse } = pkg;
import fs from 'fs';
import fetch from 'node-fetch';
import contentType from 'content-type';
import { config } from './config.js';
import { decryptUrl, encryptUrl } from './encrypt.js';
import { handleError } from './error.js';
import { rewrite, rewriteCssImport, rewriteJsImportWithEsotope } from './rewrite.js';

import pkg2 from 'http-proxy';
const { createProxyServer } = pkg2;

const wsProxy = createProxyServer({ ws: true });

export async function createGloomServer(server) {
  server.on('request', async (req, res) => {
    try {
      const reqUrl = url.parse(req.url, true);

      if (reqUrl.pathname.startsWith(config.prefix)) {
        console.log(`Received proxied request for ${req.url}`);
        let decodedUrl, proxiedUrl;

        try {
          decodedUrl = decodeURIComponent(reqUrl.pathname.slice(config.prefix.length));
          proxiedUrl = decryptUrl(decodedUrl);
        } catch (err) {
          console.error(`Failed to decode or decrypt URL: ${err}`);
          handleError(err, req, res);
          return;
        }

        console.log(`Decoded URL: ${decodedUrl}`);
        console.log(`Proxied URL: ${proxiedUrl}`);

        try {
          const assetUrl = new URL(proxiedUrl);
          const asset = await fetch(assetUrl);

          if (!asset.ok) {
            console.error(`Failed to fetch asset: ${asset.status} ${asset.statusText}`);
            handleError(new Error(`Failed to fetch asset: ${asset.status} ${asset.statusText}`), req, res);
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

            // Rewrite links in CSS imports
            root.querySelectorAll('style').forEach(styleElement => {
              const styleContent = styleElement.innerHTML;
              const rewrittenStyle = rewriteCssImport(styleContent, proxiedUrl);
              styleElement.innerHTML = rewrittenStyle;
            });

            // Rewrite src and href attributes in HTML elements
            root.querySelectorAll('*').forEach(element => {
              rewrite(element, proxiedUrl);
              if (element.tagName === 'script' && element.getAttribute('src')) {
                const scriptUrl = new URL(element.getAttribute('src'), proxiedUrl);
                element.setAttribute('src', `${config.prefix}${scriptUrl}`);
              }
              if (element.tagName === 'link' && element.getAttribute('rel') === 'stylesheet' && element.getAttribute('href')) {
                const cssUrl = new URL(element.getAttribute('href'), proxiedUrl);
                element.setAttribute('href', `${config.prefix}${cssUrl}`);
              }
            });

            res.end(root.toString());
          } else if (parsedContentType.includes('application/javascript')) {
            const script = await asset.text();
            const rewrittenScript = rewriteJsImportWithEsotope(script, proxiedUrl);
            res.end(rewrittenScript);
          } else if (parsedContentType.includes('text/css')) {
            const css = await asset.text();
            const rewrittenCss = rewriteCssImport(css, proxiedUrl);
            res.end(rewrittenCss);
          } else {
            res.end(Buffer.from(await asset.arrayBuffer()));
          }
        } catch (error) {
          console.error(`Error handling request: ${error}`);
          handleError(error, req, res);
        }
      }
    } catch (error) {
      console.error(`Unhandled error: ${error}`);
      handleError(error, req, res);
    }
  });

  server.on('upgrade', (req, socket, head) => {
    try {
      const reqUrl = url.parse(req.url, true);
      console.log(`Received upgrade request for ${req.url}`);
      const decodedUrl = decodeURIComponent(reqUrl.pathname.slice(config.prefix.length));
      console.log(`Decoded URL for upgrade: ${decodedUrl}`);
      const proxiedUrl = decryptUrl(decodedUrl);
      console.log(`Proxied URL for upgrade: ${proxiedUrl}`);
      wsProxy.ws(req, socket, head, { target: proxiedUrl });
    } catch (err) {
      console.error(`Error during WebSocket upgrade: ${err}`);
      handleError(err, req, res);
    }
  });

  return server;
}
