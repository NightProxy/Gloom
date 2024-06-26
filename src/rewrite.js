import { config } from './config.js';
import { encryptUrl } from './encrypt.js';

const cssImportRegex = /(?<=url\("?'?)[^"'][\S]*[^"'](?="?'?\);?)/g;
const jsImportRegex = /(?<=import\s*['"])[^'"]+(?=['"])/g;
const attributes = ['href', 'src'];

export function rewrite(element, proxyUrl) {
    attributes.forEach(attr => {
        const attrValue = element.getAttribute(attr);
        if (attrValue) {
            try {
                const url = new URL(attrValue, proxyUrl);
                const encryptedUrl = encryptUrl(url.toString());
                element.setAttribute(attr, `${config.prefix}${encryptedUrl}`);
            } catch (e) {
                console.error(`Invalid URL in attribute ${attr}: ${attrValue}`, e);
            }
        }
    });

    element.removeAttribute('integrity');

    if (element.hasAttribute('style')) {
        const newStyleValue = element.getAttribute('style').replace(cssImportRegex, match => {
            try {
                const url = new URL(match, proxyUrl);
                const encryptedUrl = encryptUrl(url.toString());
                return `${config.prefix}${encryptedUrl}`;
            } catch (e) {
                console.error(`Invalid URL in style attribute: ${match}`, e);
                return match;
            }
        });
        element.setAttribute('style', newStyleValue);
    }

    if (element.tagName === 'SCRIPT' && element.type?.toLowerCase() === 'module') {
        fetch(new URL(element.src, proxyUrl))
            .then(res => res.text())
            .then(script => {
                const newScript = script.replace(jsImportRegex, match => {
                    try {
                        const url = new URL(match, proxyUrl);
                        const encryptedUrl = encryptUrl(url.toString());
                        return `${config.prefix}${encryptedUrl}`;
                    } catch (e) {
                        console.error(`Invalid URL in script import: ${match}`, e);
                        return match;
                    }
                });
                element.src = URL.createObjectURL(new Blob([newScript], { type: 'application/javascript' }));
            })
            .catch(err => {
                console.error(`Failed to fetch script: ${err}`);
            });
    }
}

export function rewriteCssImport(styleContent, proxyUrl) {
    return styleContent.replace(cssImportRegex, match => {
        try {
            const url = new URL(match, proxyUrl);
            const encryptedUrl = encryptUrl(url.toString());
            return `${config.prefix}${encryptedUrl}`;
        } catch (e) {
            console.error(`Invalid URL in CSS import: ${match}`, e);
            return match;
        }
    });
}
