"use strict";

const remoteUrl = process.argv[2];
if (!remoteUrl || !/^http:\/\/[^\s]+\/remote(?:[/?#]|$)/i.test(remoteUrl)) {
  console.error("Usage: node scripts/show-remote-qr.js http://<LAN-IP>:3000/remote");
  process.exit(2);
}

try {
  const qrcode = require("qrcode-terminal");
  qrcode.setErrorLevel("M");
  qrcode.generate(remoteUrl, { small: true }, (code) => {
    process.stdout.write(`${code}\n`);
  });
} catch (error) {
  console.error("QR renderer is not installed. Run Setup once after pulling the QR update.");
  process.exit(1);
}
