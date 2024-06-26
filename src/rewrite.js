import { config } from './config.js';
import { encryptUrl, decryptUrl } from './encrypt.js';
import pkg from 'esotope-hammerhead';
const { Syntax, parseScript } = pkg;

const cssImportRegex = /(?<=url\("?'?)[^"'][\S]*[^"'](?="?'?\);?)/g;
const jsUrlRegex = /((src|href|import|export|fetch|XMLHttpRequest|open|new\s+URL\([\s\S]*?['"])(http[s]?:\/\/.*?)(['"]))/g;
const dynamicScriptRegex = /(?<=script\.setAttribute\(['"]src['"],\s*['"])[^'"]+(?=['"])/g;
const dynamicUrlRegex = /new\s+URL\(\s*(['"`])(.*?)\1\s*,\s*window\.location\.origin\s*\)/g;
const attributes = ['href', 'src'];

function shouldRewrite(url) {
    return (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('ws:') || url.startsWith('wss:') || url.startsWith('/')) &&
           !url.startsWith('data:') && !url.startsWith('mailto:');
}

export function rewrite(element, proxyUrl) {
    attributes.forEach(attr => {
        const attrValue = element.getAttribute(attr);
        if (attrValue && shouldRewrite(attrValue)) {
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
            if (shouldRewrite(match)) {
                try {
                    const url = new URL(match, proxyUrl);
                    const encryptedUrl = encryptUrl(url.toString());
                    return `${config.prefix}${encryptedUrl}`;
                } catch (e) {
                    console.error(`Invalid URL in style attribute: ${match}`, e);
                }
            }
            return match;
        });
        element.setAttribute('style', newStyleValue);
    }

    if (element.tagName === 'SCRIPT') {
        fetch(new URL(element.src, proxyUrl))
            .then(res => res.text())
            .then(script => {
                const newScript = rewriteJsImport(script, proxyUrl);
                element.src = URL.createObjectURL(new Blob([newScript], { type: 'application/javascript' }));
            })
            .catch(err => {
                console.error(`Failed to fetch script: ${err}`);
            });
    }
}

export function rewriteCssImport(styleContent, proxyUrl) {
    return styleContent.replace(cssImportRegex, match => {
        if (shouldRewrite(match)) {
            try {
                const url = new URL(match, proxyUrl);
                const encryptedUrl = encryptUrl(url.toString());
                return `${config.prefix}${encryptedUrl}`;
            } catch (e) {
                console.error(`Invalid URL in CSS import: ${match}`, e);
            }
        }
        return match;
    });
}

export function rewriteJsImport(scriptContent, proxyUrl) {
    return scriptContent.replace(jsUrlRegex, (match, prefix, _, url, suffix) => {
        if (shouldRewrite(url)) {
            try {
                const newUrl = new URL(url, proxyUrl);
                const encryptedUrl = encryptUrl(newUrl.toString());
                return `${prefix}${config.prefix}${encryptedUrl}${suffix}`;
            } catch (e) {
                console.error(`Invalid URL in JS import: ${url}`, e);
            }
        }
        return match;
    }).replace(dynamicScriptRegex, match => {
        if (shouldRewrite(match)) {
            try {
                const url = new URL(match, proxyUrl);
                const encryptedUrl = encryptUrl(url.toString());
                return `${config.prefix}${encryptedUrl}`;
            } catch (e) {
                console.error(`Invalid URL in dynamic script src: ${match}`, e);
            }
        }
        return match;
    }).replace(dynamicUrlRegex, (match, quote, url) => {
        if (shouldRewrite(url)) {
            try {
                const newUrl = new URL(url, proxyUrl);
                const encryptedUrl = encryptUrl(newUrl.toString());
                return `new URL(${quote}${config.prefix}${encryptedUrl}${quote}, window.location.origin)`;
            } catch (e) {
                console.error(`Invalid URL in dynamic URL construction: ${url}`, e);
            }
        }
        return match;
    });
}

// Rewrite JavaScript files using esotope-hammerhead
export function rewriteJs(ctx, proxyUrl) {
    const { js } = ctx;

    js.on('Literal', (node, data, type) => {
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

    js.on('ImportDeclaration', (node, data, type) => {
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

    js.on('ImportExpression', (node, data, type) => {
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

    js.on('CallExpression', (node, data, type) => {
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

    js.on('MemberExpression', (node, data, type) => {
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

export function rewriteJsImportWithEsotope(scriptContent, proxyUrl) {
    const ast = parseScript(scriptContent);
    const ctx = { js: new modify.JsProcessor(ast) };
    rewriteJs(ctx, proxyUrl);
    const changes = ctx.js.changes;
    let rewrittenScript = scriptContent;

    for (const change of changes) {
        rewrittenScript = rewrittenScript.substring(0, change.start) + change.node + rewrittenScript.substring(change.end);
    }

    return rewrittenScript;
}
