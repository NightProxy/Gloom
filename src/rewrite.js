import { config } from './config.js';
import { encryptUrl, decryptUrl } from './encrypt.js';

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

import { Syntax } from 'esotope-hammerhead';

export function rewriteJs(ctx, proxyUrl) {
    const { js } = ctx;

    js.on(Syntax.Literal, (node, data, type) => {
        // Rewrite URLs in string literals
        if (typeof node.value === 'string') {
            const decryptedUrl = decryptUrl(node.value);
            if (decryptedUrl !== node.value) {
                data.changes.push({
                    start: node.start + 1,
                    end: node.end - 1,
                    node: type === 'rewrite' ? decryptedUrl : encryptUrl(decryptedUrl),
                });
            }
        }
    });

    js.on(Syntax.ImportDeclaration, (node, data, type) => {
        // Rewrite URLs in import declarations
        if (node.source && typeof node.source.value === 'string') {
            const decryptedUrl = decryptUrl(node.source.value);
            if (decryptedUrl !== node.source.value) {
                data.changes.push({
                    start: node.source.start + 1,
                    end: node.source.end - 1,
                    node: type === 'rewrite' ? decryptedUrl : encryptUrl(decryptedUrl),
                });
            }
        }
    });

    js.on(Syntax.ImportExpression, (node, data, type) => {
        // Rewrite URLs in dynamic imports
        if (node.source && typeof node.source.value === 'string') {
            const decryptedUrl = decryptUrl(node.source.value);
            if (decryptedUrl !== node.source.value) {
                data.changes.push({
                    start: node.source.start + 1,
                    end: node.source.end - 1,
                    node: type === 'rewrite' ? decryptedUrl : encryptUrl(decryptedUrl),
                });
            }
        }
    });

    js.on(Syntax.CallExpression, (node, data, type) => {
        // Rewrite URLs in call expressions (e.g., fetch, XMLHttpRequest)
        if (node.callee && node.callee.name && ['fetch', 'XMLHttpRequest', 'open'].includes(node.callee.name)) {
            node.arguments.forEach(arg => {
                if (arg.type === 'Literal' && typeof arg.value === 'string') {
                    const decryptedUrl = decryptUrl(arg.value);
                    if (decryptedUrl !== arg.value) {
                        data.changes.push({
                            start: arg.start + 1,
                            end: arg.end - 1,
                            node: type === 'rewrite' ? decryptedUrl : encryptUrl(decryptedUrl),
                        });
                    }
                }
            });
        }
    });

    js.on(Syntax.MemberExpression, (node, data, type) => {
        // Rewrite URLs in window.location or document.location assignments
        if (node.object && node.object.name === 'location') {
            if (node.property && node.property.name && node.property.name === 'href') {
                const parent = node.parent;
                if (parent && parent.type === 'AssignmentExpression' && parent.right.type === 'Literal' && typeof parent.right.value === 'string') {
                    const decryptedUrl = decryptUrl(parent.right.value);
                    if (decryptedUrl !== parent.right.value) {
                        data.changes.push({
                            start: parent.right.start + 1,
                            end: parent.right.end - 1,
                            node: type === 'rewrite' ? decryptedUrl : encryptUrl(decryptedUrl),
                        });
                    }
                }
            }
        }
    });
}
