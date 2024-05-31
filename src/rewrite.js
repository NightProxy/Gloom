export function rewriteUrls(root, prefix, encryptUrl) {
    ['href', 'src', 'action'].forEach((attribute) => {
        root.querySelectorAll(`[${attribute}]`).forEach((element) => {
            const url = element.getAttribute(attribute);
            if (url && url.startsWith('http')) {
                element.setAttribute(attribute, `${prefix}${encryptUrl(url)}`);
            }
        });
    });
}
