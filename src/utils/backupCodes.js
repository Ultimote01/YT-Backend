const crypto = require("crypto");
const bcrypt = require("bcrypt");

exports.generateBackupCodes = async () => {
  const codes = [];

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex");
    const hash = await bcrypt.hash(code, 10);
    codes.push({ code, hash });
  }

  return codes;
};
