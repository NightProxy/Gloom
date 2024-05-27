// encrypt.js

class Crypts {
    static encode(str, key) {
      return encodeURIComponent(
        str
          .toString()
          .split("")
          .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ key.charCodeAt(ind % key.length)) : char))
          .join("")
      );
    }
  
    static decode(str, key) {
      if (str.charAt(str.length - 1) === "/") {
        str = str.slice(0, -1);
      }
      return decodeURIComponent(
        str
          .split("")
          .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ key.charCodeAt(ind % key.length)) : char))
          .join("")
      );
    }
  }
  
  function encryptUrl(url, encryption) {
    switch (encryption.method) {
      case 'base64':
        return Buffer.from(url).toString('base64');
      case 'xor':
        return Crypts.encode(url, encryption.key);
      default:
        return url;
    }
  }
  
  function decryptUrl(path, encryption) {
    switch (encryption.method) {
      case 'base64':
        return Buffer.from(path, 'base64').toString('ascii');
      case 'xor':
        return Crypts.decode(path, encryption.key);
      default:
        return path;
    }
  }
  
  module.exports = {
    encryptUrl,
    decryptUrl,
  };