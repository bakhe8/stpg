import * as webPush from 'web-push';
import * as fs from 'fs';
import * as path from 'path';

const vapidKeys = webPush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

const envPath = path.join(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

if (!envContent.includes('VAPID_PUBLIC_KEY')) {
  envContent += `\nVAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`;
  envContent += `\nVAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`;
  envContent += `\nVAPID_SUBJECT="mailto:admin@example.com"`;
  fs.writeFileSync(envPath, envContent);
  console.log('Added VAPID keys to .env');
} else {
  console.log('VAPID keys already exist in .env');
}
