const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const input = document.querySelector("input");

const swConfig = {
  uv: { file: "/@/sw.js", config: __uv$config }
};

// crypts class definition
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

function search(input) {
  input = input.trim();
  const searchTemplate = localStorage.getItem("engine") || "https://google.com/search?q=%s";

  try {
    return new URL(input).toString();
  } catch (err) {
    try {
      const url = new URL(`http://${input}`);
      if (url.hostname.includes(".")) {
        return url.toString();
      }
      throw new Error("Invalid hostname");
    } catch (err) {
      return searchTemplate.replace("%s", encodeURIComponent(input));
    }
  }
}
var proxySetting = localStorage.getItem("proxy") || "uv";


if (proxySetting == "uv") {
  if ("serviceWorker" in navigator) {
    let { file: swFile, config: swConfigSettings } = swConfig[proxySetting];

    navigator.serviceWorker
      .register(swFile, { scope: swConfigSettings.prefix })
      .then((registration) => {
        console.log("ServiceWorker registration successful with scope: ", registration.scope);
        form.addEventListener("submit", async (event) => {
          event.preventDefault();

          let encodedUrl = swConfigSettings.prefix + crypts.encode(search(address.value));
          
          location.href = encodedUrl;
        });
      })
      .catch((error) => {
        console.error("ServiceWorker registration failed:", error);
      });
  }
} else {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let encodedUrl = "/gloom/" + crypts.encode(encodeURIComponent(search(address.value)));
    
    location.href = encodedUrl;
  });
}

function saveSelectedProxyOption() {
  var selectedOption = document.getElementById("proxySwitcher").value;
  localStorage.setItem("proxy", selectedOption);
}

function loadSavedProxyOption() {
  var savedOption = localStorage.getItem("proxy");
  if (savedOption) {
    document.getElementById("proxySwitcher").value = savedOption;
  }
}
document.getElementById("proxySwitcher").addEventListener("change", function () {
  saveSelectedProxyOption();
  location.reload();
});

window.addEventListener("load", loadSavedProxyOption);
