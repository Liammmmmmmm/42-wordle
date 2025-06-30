const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, './app.log');

function log(message) {
    const timestamp = new Date().toISOString();
    fs.appendFile(logFile, `[${timestamp}] ${message}\n`, (err) => {
        if (err) console.error('Erreur lors de l\'écriture du log:', err);
    });
}

module.exports = log;