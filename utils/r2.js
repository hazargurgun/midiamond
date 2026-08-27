const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const sharp = require('sharp');

let cachedClient = null;

function requiredEnv() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucket = process.env.R2_BUCKET;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const publicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicBase) {
        throw new Error(
            'R2 ayarları eksik. R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ve R2_PUBLIC_BASE_URL gerekli.'
        );
    }

    return { accountId, bucket, accessKeyId, secretAccessKey, publicBase };
}

function getClient() {
    if (cachedClient) return cachedClient;
    const { accountId, accessKeyId, secretAccessKey } = requiredEnv();
    cachedClient = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey }
    });
    return cachedClient;
}

function publicUrl(key) {
    const { publicBase } = requiredEnv();
    return `${publicBase}/${key}`;
}

function folderFor(req, file) {
    if (file.mimetype && file.mimetype.startsWith('video/')) return 'videos';
    if (req && req.originalUrl && req.originalUrl.includes('/banners')) return 'banners';
    return 'products';
}

function extFromName(file) {
    const fromName = path.extname(file.originalname || '').toLowerCase();
    if (fromName) return fromName;
    if (file.mimetype === 'video/webm') return '.webm';
    if (file.mimetype === 'video/quicktime') return '.mov';
    return '.mp4';
}

async function putBuffer(key, body, contentType) {
    const { bucket } = requiredEnv();
    await getClient().send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
    }));
    return publicUrl(key);
}

async function putFileStream(key, filePath, contentType) {
    const { bucket } = requiredEnv();
    const upload = new Upload({
        client: getClient(),
        params: {
            Bucket: bucket,
            Key: key,
            Body: fs.createReadStream(filePath),
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable'
        }
    });
    await upload.done();
    return publicUrl(key);
}

async function makeVariants(input) {
    const large = await sharp(input, { failOn: 'none' })
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    const thumb = await sharp(input, { failOn: 'none' })
        .rotate()
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    return { large, thumb };
}

async function uploadImageVariants(input, folder) {
    const id = crypto.randomUUID();
    const { large, thumb } = await makeVariants(input);
    const largeKey = `${folder}/${id}.webp`;
    const thumbKey = `${folder}/${id}_thumb.webp`;
    const largeUrl = await putBuffer(largeKey, large, 'image/webp');
    await putBuffer(thumbKey, thumb, 'image/webp');
    return largeUrl;
}

async function uploadVideoFile(filePath, file, folder) {
    const id = crypto.randomUUID();
    const key = `${folder}/${id}${extFromName(file)}`;
    return putFileStream(key, filePath, file.mimetype || 'video/mp4');
}

async function uploadVideoBuffer(buffer, contentType, folder) {
    const id = crypto.randomUUID();
    let ext = '.mp4';
    if (contentType && contentType.includes('webm')) ext = '.webm';
    else if (contentType && contentType.includes('quicktime')) ext = '.mov';
    const key = `${folder}/${id}${ext}`;
    return putBuffer(key, buffer, contentType || 'video/mp4');
}

async function processMulterFile(req, file) {
    const tempPath = file.path;
    const folder = folderFor(req, file);
    try {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            file.path = await uploadImageVariants(tempPath, folder);
        } else {
            file.path = await uploadVideoFile(tempPath, file, folder);
        }
    } finally {
        await fsp.unlink(tempPath).catch(() => {});
    }
}

module.exports = {
    requiredEnv,
    publicUrl,
    processMulterFile,
    uploadImageVariants,
    uploadVideoBuffer,
    folderFor
};
