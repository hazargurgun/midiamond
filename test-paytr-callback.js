const http = require('http');

// Yerel sunucumuzu test edelim
const postData = new URLSearchParams({
    merchant_oid: 'OID123456789',
    status: 'success',
    total_amount: '10000',
    hash: 'test_hash',
    payment_type: 'card'
}).toString();

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/payment/callback',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('PayTR callback testi başlatılıyor...');
console.log('URL:', `http://localhost:3000/payment/callback`);
console.log('Data:', postData);

const req = http.request(options, (res) => {
    console.log('Durum Kodu:', res.statusCode);
    console.log('Başlıklar:', res.headers);
    
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log('Yanıt:', chunk);
        if (chunk.trim() === 'OK') {
            console.log('\n✅ BAŞARILI: Callback doğru şekilde "OK" yanıtını döndü!');
        }
    });
});

req.on('error', (e) => {
    console.error(`Hata: ${e.message}`);
});

req.write(postData);
req.end();
