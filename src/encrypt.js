import { config } from './config.js';

class crypts {
  static encode(str) {
    return encodeURIComponent(
      str
        .toString()
        .split("")
        .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char))
        .join("")
    );
  }

  static decode(str) {
    return decodeURIComponent(
      str
        .split("")
        .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char))
        .join("")
    );
  }
}

export function encryptUrl(url) {
  switch (config.encryption.method) {
    case 'base64':
      return Buffer.from(url).toString('base64');
    case 'xor':
      return crypts.encode(url);
    case 'none':
      return url;
    default:
      return url;
  }
}

export function decryptUrl(path) {
  switch (config.encryption.method) {
    case 'base64':
      return Buffer.from(path, 'base64').toString('ascii');
    case 'xor':
      return crypts.decode(path);
    case 'none':
      return path;
    default:
      return path;
  }
}
