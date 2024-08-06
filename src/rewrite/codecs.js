const config = self.__gloom$config;
class crypts {
  static xorEncode(str) {
    return encodeURIComponent(
      str
        .toString()
        .split("")
        .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char))
        .join("")
    );
  }

  static xorDecode(str) {
    return decodeURIComponent(
      str
        .split("")
        .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt() ^ 2) : char))
        .join("")
    );
  }
  static base64Encode(str) {
    if (!str){
      return str;
    }
    str = str.toString();
    return decodeURIComponent(btoa(str))
  }
  static base64Decode(str) {
    if (!str){
      return str;
    }
    str = str.toString();
    return atob(str);
  }
}

export function encryptUrl(url) {
  switch (config.encoding) {
    case 'base64':
      return crypts.base64Encode(url);
    case 'xor':
      return crypts.xorEncode(url);
    case 'none':
    default:
      return encodeURIComponent(url);
  }
}

export function decryptUrl(path) {
  switch (config.encoding) {
    case 'base64':
      return crypts.base64Decode(path);
    case 'xor':
      return crypts.xorDecode(path);
    case 'none':
    default:
      return decodeURIComponent(path);
  }
}
