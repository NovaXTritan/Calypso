// Initialize pod stats by calling the recalculatePodStats Cloud Function
// Run with: node scripts/init-pod-stats.js

const https = require('https');

const PROJECT_ID = 'cosmos-e42b5';
const REGION = 'us-central1';
const FUNCTION_NAME = 'recalculatePodStats';

// Get the function URL
const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`;

console.log('Calling recalculatePodStats...');
console.log('URL:', url);

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);

    if (res.statusCode === 200) {
      console.log('\nPod stats initialized successfully!');
    } else {
      console.log('\nNote: If you get a 401/403, the function may need authentication.');
      console.log('You can also initialize stats by creating a proof in the app.');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(JSON.stringify({ data: {} }));
req.end();
