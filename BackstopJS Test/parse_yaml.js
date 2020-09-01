const YAML = require('yaml');
const fs = require('fs');

const file = fs.readFileSync('nyu.yml', 'utf8');
const parsed = YAML.parse(file);

console.log(parsed);