const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function encryptFile(inputPath, outputPath, key) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const data = require('fs').readFileSync(inputPath);
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  require('fs').writeFileSync(outputPath, Buffer.concat([iv, tag, enc]));
  return { ivLen: IV_LEN, tagLen: TAG_LEN, bytes: enc.length };
}

function decryptFile(inputPath, outputPath, key) {
  const buf = require('fs').readFileSync(inputPath);
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  require('fs').writeFileSync(outputPath, dec);
}

module.exports = { encryptFile, decryptFile };
