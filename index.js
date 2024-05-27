const express = require('express');
const request = require('request');
const app = express();
const { parse } = require('node-html-parser');
const config = require('./src/config.js');
const { rewriteUrls } = require('./src/rewrite.js');
const { decryptUrl } = require('./src/encrypt.js');
const { handleError } = require('./src/error.js');
app.use(config.prefix, (req, res, next) => {
    let path = req.path.slice(1); // Remove the leading slash
    try {
      req.proxiedUrl = decryptUrl(path, config.encryption);
      next();
    } catch (error) {
      handleError(error, req, res);
    }
  });
  
  // Middleware to handle requests and inject rewritten URLs
  app.use(config.prefix, (req, res) => {
    request({ uri: req.proxiedUrl, encoding: null }, (error, response, body) => {
      if (error) {
        return handleError(error, req, res);
      }
  
      // Modify response headers here if necessary, e.g., set content-type
      res.writeHead(response.statusCode, response.headers);
  
      if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
        // Parse the HTML content
        const root = parse(body.toString());
        // Rewrite URLs in the HTML content
        ['href', 'src', 'action'].forEach((attribute) => {
          root.querySelectorAll(`[${attribute}]`).forEach((element) => {
            const url = element.getAttribute(attribute);
            if (url.startsWith('http')) {
              element.setAttribute(attribute, `${config.prefix}${encryptUrl(url)}`);
            }
          });
        });
        // Send the modified HTML content
        res.end(root.toString());
      } else {
        // Send the original content for non-HTML responses
        res.end(body);
      }
    });
  });
  
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });