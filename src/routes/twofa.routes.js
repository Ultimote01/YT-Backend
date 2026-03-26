const express = require("express");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");


const User = require("../models/user");
const auth = require("../middleware/auth.middleware");
const { setNotifications , sendToken ,changeTime} = require("../routes/auth.routes");
const catchAsync = require("../utils/catchAsync");


const router = express.Router();

router.post("/setup", auth, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user){
     const secret = speakeasy.generateSecret({
    name: `2FA-App (${user.email})`
  }); 

  user.twoFASecret = secret.base32;
  await user.save();

  const qr = await QRCode.toDataURL(secret.otpauth_url);

  return res.status(200).json({ qr, manualCode: secret.base32 });
  
  }
  
  res.status(404).json({
    status: "fail",
    message: "User not found "

  })
    
})
);


router.post("/verify", auth, catchAsync( async (req, res) => {
  const user = await User.findById(req.user.id);

  const verified = speakeasy.totp.verify({
    secret: user.twoFASecret,
    encoding: "base32",
    token: req.body.otp,
    window: 1
  });

  if (!verified) return res.status(400).json({ error: "Invalid token" });

  user.twoFAEnabled = true;

  const twoFACreated = user.twoFAMethods.some((method)=> {
    if (req.body?.method === method?.name)
     return true; return false; })

  if (!twoFACreated){
     user.twoFAMethods.push({
      name: req.body?.method,
    })
  } 

  await user.save();

  

  res.status(200).json({ message: "2FA enabled", twoFAData:{
     name: req.body?.method,
     preferred: false
  } });
})
); 


router.post("/auth", catchAsync(async (req, res,)=> {
   
    const tokenVerify = jwt.verify(req.body.tempToken, process.env.JWT_SECRET);
    const user = await User.findById(tokenVerify?.id);
 
    if (!tokenVerify) res.status(401).json({
      statu: 401,
      message: "Please log in complete process"
    });


    const verified = speakeasy.totp.verify({
    secret: user?.twoFASecret,
    encoding: "base32",
    token: req.body.otp,
    window: 1
  })

  if (!verified){  return res.status(403).json({
    status: "fail",
    message: "Invalid code"
  });
  
}
 

user.passwordHash= undefined;
user.id = undefined;


setNotifications(user);
sendToken(user, 200, res);

}


)
);

module.exports = router;