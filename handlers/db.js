const Keyv = require('keyv');
const db = new Keyv('sqlite://airlink.db');

module.exports = { db }