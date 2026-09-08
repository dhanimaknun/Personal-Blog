// Generate a bcrypt hash for ADMIN_PASSWORD_HASH.
//   npm run hash -- "your-real-password"
//   node scripts/hash-password.js "your-real-password"
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash -- "your-password"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log("\nADMIN_PASSWORD_HASH=" + JSON.stringify(hash) + "\n");
});
