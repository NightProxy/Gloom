const { encryptUrl } = require('./encrypt');
const config = require('./config');

function rewriteUrls(body) {
  // This regex will match http and https URLs within href, src, and action attributes
  const urlRegex = /(?:href|src|action)="(http[s]?:\/\/[^"]+)"/g;
  return body.replace(urlRegex, (match, p1) => {
    const encryptedUrl = encryptUrl(p1);
    return match.replace(p1, `${config.prefix}${encryptedUrl}`);
  });
}

module.exports = {
  rewriteUrls,
};