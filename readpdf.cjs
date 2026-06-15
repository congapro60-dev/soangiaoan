const fs = require('fs');
const pdf = require('pdf-parse');

const file = 'C:\\Users\\ADMIN\\Downloads\\smart-lesson-plan-ai\\[BTL] Hướng dẫn đầy đủ để xây dựng Skills Claude AI (2026).pdf';

let dataBuffer = fs.readFileSync(file);

pdf(dataBuffer).then(function(data) {
    console.log("Pages:", data.numpages);
    console.log("First 2000 chars:");
    console.log(data.text.substring(0, 2000));
}).catch(e => console.error(e));
