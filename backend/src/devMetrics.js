const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'config', 'dev-metrics.json');

function readDevMetrics() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    return { token: '', svt_av1_available: null, queue_depth: null };
  }
}

function writeDevMetrics(obj) {
  fs.writeFileSync(configPath, JSON.stringify(obj, null, 2));
}

module.exports = {
  readDevMetrics,
  writeDevMetrics
};
