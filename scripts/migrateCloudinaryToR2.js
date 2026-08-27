require('dotenv').config();

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

async function download(url) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const contentType = res.headers.get('content-type') || '';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) {
        throw new Error('Boş dosya');
    }
    return { buffer, contentType };
}

async function migrateOne(url, folder) {
    if (!shouldMigrate(url)) return { url, skipped: true };
    const { buffer, contentType } = await download(url);
    if (isVideoUrl(url, contentType)) {
        const next = await uploadVideoBuffer(buffer, contentType, 'videos');
        return { url: next, skipped: false };
    }
    const next = await uploadImageVariants(buffer, folder);
    return { url: next, skipped: false };
}

async function run() {
    requiredEnv();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlandı. Cloudinary → R2 göçü başlıyor...');

    const failed = [];
    let migrated = 0;
    let skipped = 0;

    const products = await Product.find();
    for (const product of products) {
        let changed = false;

        try {
            const main = await migrateOne(product.imageUrl, 'products');
            if (!main.skipped) {
                product.imageUrl = main.url;
                changed = true;
                migrated += 1;
            } else {
                skipped += 1;
            }
        } catch (err) {
            failed.push({ type: 'product.imageUrl', id: product._id.toString(), url: product.imageUrl, error: err.message });
        }

        if (Array.isArray(product.images) && product.images.length) {
            for (const img of product.images) {
                try {
                    const result = await migrateOne(img.url, 'products');
                    if (!result.skipped) {
                        img.url = result.url;
                        changed = true;
                        migrated += 1;
                    } else {
                        skipped += 1;
                    }
                } catch (err) {
                    failed.push({ type: 'product.images', id: product._id.toString(), url: img.url, error: err.message });
                }
            }
        }

        if (product.videoUrl) {
            try {
                const result = await migrateOne(product.videoUrl, 'videos');
                if (!result.skipped) {
                    product.videoUrl = result.url;
                    changed = true;
                    migrated += 1;
                } else {
                    skipped += 1;
                }
            } catch (err) {
                failed.push({ type: 'product.videoUrl', id: product._id.toString(), url: product.videoUrl, error: err.message });
            }
        }

        if (changed) {
            await product.save();
            console.log('Ürün güncellendi:', product.name);
        }
    }

    const banners = await Banner.find();
    for (const banner of banners) {
        let changed = false;
        try {
            const main = await migrateOne(banner.imageUrl, 'banners');
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
                const mobile = await migrateOne(banner.mobileImageUrl, 'banners');
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
        console.log('Başarısız olanları admin panelinden yeniden yükleyin.');
    }

    await mongoose.disconnect();
    process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
