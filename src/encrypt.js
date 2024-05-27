class Crypts {
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
      if (str.charAt(str.length - 1) === "/") {
        str = str.slice(0, -1);
      }
      return decodeURIComponent(
        str
          .split("")
          .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char))
          .join("")
      );
    }
  }
  
  function encryptUrl(url) {
    return Crypts.encode(url);
  }
  
  function decryptUrl(path, encryption) {
    let decryptedUrl;
    switch (encryption) {
      case 'base64':
        decryptedUrl = Buffer.from(path, 'base64').toString('ascii');
        break;
      case 'xor':
        decryptedUrl = Crypts.decode(path);
        break;
      case 'none':
        decryptedUrl = path;
        break;
      default:
        throw new Error('Unsupported encryption method.');
    }
    return decryptedUrl;
  }
  
  module.exports = {
    encryptUrl,
    decryptUrl,
  };