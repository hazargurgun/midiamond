const PLACEHOLDER = '/uploads/premium_diamond_ring.png';
const VIDEO_EXT = /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i;

function isLocalAsset(url) {
    return typeof url === 'string' && url.startsWith('/');
}

function isCloudinary(url) {
    return typeof url === 'string' && (
        url.includes('res.cloudinary.com') ||
        url.includes('cloudinary.com')
    );
}

function isDummyThemeImage(url) {
    return typeof url === 'string' && /\/gallery\/popular[1-4]\.png(\?|$)/.test(url);
}

function toThumb(url) {
    if (!url || VIDEO_EXT.test(url)) return url;
    if (url.includes('_thumb.')) return url;
    return url.replace(/(\.[a-zA-Z0-9]+)(\?.*)?$/, '_thumb$1$2');
}

/**
 * Listing → 'thumb', PDP / banner / lightbox → 'large'
 * Cloudinary ve eski tema dummy görselleri mücevher placeholder'ına düşer.
 */
function mediaUrl(url, size) {
    if (!url || isCloudinary(url) || isDummyThemeImage(url)) {
        return PLACEHOLDER;
    }
    if (isLocalAsset(url)) {
        return url;
    }
    if (size === 'thumb') {
        return toThumb(url);
    }
    return url;
}

module.exports = mediaUrl;
module.exports.PLACEHOLDER = PLACEHOLDER;
module.exports.isCloudinary = isCloudinary;
module.exports.isLocalAsset = isLocalAsset;
module.exports.toThumb = toThumb;
