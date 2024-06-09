export function rewriteUrls(root, prefix, encryptUrl) {
    console.log("rewriting URLS...")
    ['href', 'src'].forEach((attribute) => {
        root.querySelectorAll(`[${attribute}]`).forEach((element) => {
            const url = element.getAttribute(attribute);
            if (url && url.startsWith('http')) {
                const encryptedUrl = encryptUrl(url);
                element.setAttribute(attribute, `${prefix}/${encryptedUrl}`);
            }
        });
    });
}