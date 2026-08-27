const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { processMulterFile } = require('../utils/r2');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '') || '';
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 }
});

function collectFiles(req) {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) {
            files.push(...req.files);
        } else {
            Object.values(req.files).forEach((arr) => {
                if (Array.isArray(arr)) files.push(...arr);
            });
        }
    }
    return files;
}

async function sendToR2(req, res, next) {
    try {
        const files = collectFiles(req);
        for (const file of files) {
            await processMulterFile(req, file);
        }
        next();
    } catch (err) {
        console.error('R2 upload error:', err);
        const wantsJson = (req.originalUrl || '').includes('upload-temp')
            || (req.headers.accept || '').includes('application/json')
            || req.xhr;
        if (wantsJson) {
            return res.status(500).json({
                success: false,
                message: err.message || 'Dosya yüklenemedi.'
            });
        }
        next(err);
    }
}

module.exports = upload;
module.exports.sendToR2 = sendToR2;
