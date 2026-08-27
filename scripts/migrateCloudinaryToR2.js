require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Banner = require('../models/Banner');
const { isCloudinary, isLocalAsset } = require('../utils/mediaUrl');
const { requiredEnv, uploadImageVariants, uploadVideoBuffer } = require('../utils/r2');

function isVideoUrl(url, contentType) {
    if (contentType && contentType.startsWith('video/')) return true;
    return /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url || '');
}

function alreadyOnR2(url) {
    if (!url) return false;
    const base = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
    if (base && url.startsWith(base)) return true;
    return url.includes('.r2.dev/') || url.includes('r2.cloudflarestorage.com');
}

function shouldMigrate(url) {
    if (!url || isLocalAsset(url) || alreadyOnR2(url)) return false;
    return isCloudinary(url) || /^https?:\/\//i.test(url);
}

function parseCloudinaryUrl(url) {
    const match = String(url).match(
        /res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)\.([a-zA-Z0-9]+)(?:\?|$)/i
    );
    if (!match) return null;
    return {
        cloud: match[1],
        resourceType: match[2],
        publicId: decodeURIComponent(match[3]),
        format: match[4]
    };
}

function signParams(params, apiSecret) {
    const toSign = Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');
    return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
}

function privateDownloadUrl(parsed) {
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) return null;

    const cloud = process.env.CLOUDINARY_CLOUD_NAME || parsed.cloud;
    const timestamp = Math.floor(Date.now() / 1000);
    const params = {
        public_id: parsed.publicId,
        format: parsed.format,
        timestamp,
        type: 'upload'
    };
    const signature = signParams(params, apiSecret);
    const query = new URLSearchParams({
        public_id: parsed.publicId,
        format: parsed.format,
        timestamp: String(timestamp),
        type: 'upload',
        api_key: apiKey,
        signature
    });
    return `https://api.cloudinary.com/v1_1/${cloud}/${parsed.resourceType}/download?${query}`;
}

function cloudinaryBasicAuth() {
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) return null;
    return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

async function fetchOk(url, headers = {}) {
    const res = await fetch(url, {
        redirect: 'follow',
        headers,
        signal: AbortSignal.timeout(90000)
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}${errText ? ': ' + errText.slice(0, 180) : ''}`);
    }
    const contentType = res.headers.get('content-type') || '';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) {
        throw new Error('Boş dosya');
    }
    return { buffer, contentType };
}

async function download(url) {
    const errors = [];

    try {
        return await fetchOk(url);
    } catch (err) {
        errors.push(`public: ${err.message}`);
    }

    const parsed = parseCloudinaryUrl(url);
    const basic = cloudinaryBasicAuth();

    if (!basic) {
        throw new Error(
            `${errors.join(' | ')} | CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET yok. Render env'e ekleyip tekrar çalıştırın.`
        );
    }

    try {
        return await fetchOk(url, { Authorization: basic });
    } catch (err) {
        errors.push(`basic: ${err.message}`);
    }

    if (parsed) {
        const signed = privateDownloadUrl(parsed);
        if (signed) {
            try {
                return await fetchOk(signed);
            } catch (err) {
                errors.push(`signed: ${err.message}`);
            }
        }

        const cloud = process.env.CLOUDINARY_CLOUD_NAME || parsed.cloud;
        const adminUrl = `https://api.cloudinary.com/v1_1/${cloud}/resources/${parsed.resourceType}/upload/${encodeURIComponent(parsed.publicId)}`;
        try {
            const metaRes = await fetch(adminUrl, { headers: { Authorization: basic } });
            if (metaRes.ok) {
                const meta = await metaRes.json();
                const candidate = meta.secure_url || meta.url;
                if (candidate) {
                    try {
                        return await fetchOk(candidate, { Authorization: basic });
                    } catch (err) {
                        errors.push(`admin-url: ${err.message}`);
                    }
                }
            } else {
                const body = await metaRes.text().catch(() => '');
                errors.push(`admin: HTTP ${metaRes.status} ${body.slice(0, 120)}`);
            }
        } catch (err) {
            errors.push(`admin: ${err.message}`);
        }
    }

    throw new Error(errors.join(' | '));
}

async function migrateOne(url, folder, label) {
    if (!shouldMigrate(url)) {
        console.log(`  atlandı: ${label}`);
        return { url, skipped: true };
    }
    console.log(`  indiriliyor: ${label}`);
    const { buffer, contentType } = await download(url);
    if (isVideoUrl(url, contentType)) {
        const next = await uploadVideoBuffer(buffer, contentType, 'videos');
        console.log(`  yüklendi (video): ${next}`);
        return { url: next, skipped: false };
    }
    const next = await uploadImageVariants(buffer, folder);
    console.log(`  yüklendi (görsel): ${next}`);
    return { url: next, skipped: false };
}

async function run() {
    requiredEnv();

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.log('UYARI: CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET yok.');
        console.log('Public CDN 401 olduğu için bu anahtarlar olmadan dosyalar inmez.');
        console.log('Render Environment\'a eski Cloudinary key\'lerini ekleyip scripti tekrar çalıştırın.');
    } else {
        console.log('Cloudinary API anahtarları bulundu, imzalı indirme denenecek.');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlandı. Cloudinary → R2 göçü başlıyor...');

    const failed = [];
    let migrated = 0;
    let skipped = 0;

    const products = await Product.find();
    console.log(`Ürün sayısı: ${products.length}`);

    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        let changed = false;
        console.log(`[${i + 1}/${products.length}] ${product.name}`);

        try {
            const main = await migrateOne(product.imageUrl, 'products', 'imageUrl');
            if (!main.skipped) {
                product.imageUrl = main.url;
                changed = true;
                migrated += 1;
            } else {
                skipped += 1;
            }
        } catch (err) {
            console.log(`  HATA imageUrl: ${err.message}`);
            failed.push({ type: 'product.imageUrl', id: product._id.toString(), url: product.imageUrl, error: err.message });
        }

        if (Array.isArray(product.images) && product.images.length) {
            for (let j = 0; j < product.images.length; j++) {
                const img = product.images[j];
                try {
                    const result = await migrateOne(img.url, 'products', `images[${j}]`);
                    if (!result.skipped) {
                        img.url = result.url;
                        changed = true;
                        migrated += 1;
                    } else {
                        skipped += 1;
                    }
                } catch (err) {
                    console.log(`  HATA images[${j}]: ${err.message}`);
                    failed.push({ type: 'product.images', id: product._id.toString(), url: img.url, error: err.message });
                }
            }
        }

        if (product.videoUrl) {
            try {
                const result = await migrateOne(product.videoUrl, 'videos', 'videoUrl');
                if (!result.skipped) {
                    product.videoUrl = result.url;
                    changed = true;
                    migrated += 1;
                } else {
                    skipped += 1;
                }
            } catch (err) {
                console.log(`  HATA videoUrl: ${err.message}`);
                failed.push({ type: 'product.videoUrl', id: product._id.toString(), url: product.videoUrl, error: err.message });
            }
        }

        if (changed) {
            await product.save();
            console.log('  kayıt edildi.');
        }
    }

    const banners = await Banner.find();
    console.log(`Banner sayısı: ${banners.length}`);
    for (const banner of banners) {
        let changed = false;
        try {
            const main = await migrateOne(banner.imageUrl, 'banners', 'banner.imageUrl');
            if (!main.skipped) {
                banner.imageUrl = main.url;
                changed = true;
                migrated += 1;
            } else {
                skipped += 1;
            }
        } catch (err) {
            failed.push({ type: 'banner.imageUrl', id: banner._id.toString(), url: banner.imageUrl, error: err.message });
        }

        if (banner.mobileImageUrl) {
            try {
                const mobile = await migrateOne(banner.mobileImageUrl, 'banners', 'banner.mobileImageUrl');
                if (!mobile.skipped) {
                    banner.mobileImageUrl = mobile.url;
                    changed = true;
                    migrated += 1;
                } else {
                    skipped += 1;
                }
            } catch (err) {
                failed.push({ type: 'banner.mobileImageUrl', id: banner._id.toString(), url: banner.mobileImageUrl, error: err.message });
            }
        }

        if (changed) {
            await banner.save();
            console.log('Banner güncellendi:', banner._id.toString());
        }
    }

    console.log('---');
    console.log('Taşınan:', migrated);
    console.log('Atlanan (yerel veya zaten R2):', skipped);
    console.log('Başarısız:', failed.length);
    if (failed.length) {
        console.log(JSON.stringify(failed, null, 2));
        console.log('Hâlâ 401 ise Cloudinary hesabı tamamen kilitlidir; kısa süreliğine kredi yükleyip scripti tekrar çalıştırın veya admin’den yeniden yükleyin.');
    }

    await mongoose.disconnect();
    process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
