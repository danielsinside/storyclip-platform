const multer = require('multer');
const path = require('path');

// Simular el fileFilter del upload.js
const allowedTypes = /mp4|mov|avi|mkv|webm/;

function testFileFilter(filename, mimetype) {
  console.log(`Testing file: ${filename}`);
  console.log(`MIME type: ${mimetype}`);
  
  const extname = allowedTypes.test(path.extname(filename).toLowerCase());
  const mimetypeMatch = allowedTypes.test(mimetype);
  
  console.log(`Extension match: ${extname}`);
  console.log(`MIME type match: ${mimetypeMatch}`);
  
  return extname && mimetypeMatch;
}

// Probar con diferentes MIME types
const testCases = [
  { filename: 'test.mp4', mimetype: 'video/mp4' },
  { filename: 'test.mp4', mimetype: 'application/octet-stream' },
  { filename: 'test.mp4', mimetype: 'video/mp4; codecs="avc1.42E01E"' },
  { filename: 'test.mp4', mimetype: 'video/quicktime' }
];

console.log('Testing file filter...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  const result = testFileFilter(testCase.filename, testCase.mimetype);
  console.log(`Result: ${result ? 'PASS' : 'FAIL'}\n`);
});





