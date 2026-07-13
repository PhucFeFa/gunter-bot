const fs = require('fs');
const path = require('path');

const { jobs } = require('./src/data/jobs.js');

let summary = {};
let totalW = 0;

for (const [key, job] of Object.entries(jobs)) {
    if (!summary[job.rarity]) summary[job.rarity] = { count: 0, weight: 0 };
    summary[job.rarity].count++;
    summary[job.rarity].weight += (job.weight || 0);
    totalW += (job.weight || 0);
}

console.log("Total weight:", totalW);
console.log(summary);
