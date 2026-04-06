#!/usr/bin/env node
const crypto = require('crypto');

const tamanho = process.argv[2] ? parseInt(process.argv[2]) : 64;

const secret = crypto.randomBytes(tamanho).toString('hex');

console.log(`JWT_SECRET=${secret}`);