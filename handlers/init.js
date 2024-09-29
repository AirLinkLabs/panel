const { db } = require('../handlers/db.js');
const config = require('../config.json');
const { v4: uuidv4 } = require('uuid');
const CatLoggr = require('cat-loggr');
const log = new CatLoggr();

async function init() {
    const AirLink = await db.get('AirLink_instance');
    if (!AirLink) {
        log.init('this is probably your first time starting AirLink, welcome!');
        log.init('you can find documentation for the panel at AirLink.dev');

        let imageCheck = await db.get('images');
        if (!imageCheck) {
            log.error('before starting AirLink for the first time, you didn\'t run the seed command!');
            log.error('please run: npm run seed');
            log.error('if you didn\'t do it already, make a user for yourself: npm run createUser');
            process.exit();
        }

        let AirLinkId = uuidv4();
        let setupTime = Date.now();
        
        let info = {
            AirLinkId: AirLinkId,
            setupTime: setupTime,
            originalVersion: config.version
        }

        await db.set('AirLink_instance', info)
        log.info('initialized AirLink panel with id: ' + AirLinkId)
    }        

    log.info('init complete!')
}

module.exports = { init }