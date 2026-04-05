const express = require("express");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");


const User = require("../models/user");
const auth = require("../middleware/auth.middleware");
const { setNotifications , sendToken , isLoggedIn} = require("../routes/auth.routes");
const catchAsync = require("../utils/catchAsync");


const router = express.Router();

let reverseOtpStatus = "Invalid"; 
let reverseotpSessionId = "";

const reverseotpMap = new Map();

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

  

  const twoFACreated = user.twoFAMethods.some((method)=> {
    if (req.body?.method === method?.name)
     return true; return false; })

  if (!twoFACreated){
     user.twoFAMethods.push({
      name: req.body?.method,
    })
     user.twoFAEnabled = true;
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


router.post("/send-otp",  isLoggedIn ,catchAsync(async (req, res) => {
//    
   const { phone, countryCode} = req.body;
  
   const response = await fetch("https://app.reverseotp.com/api/v1/create_otp_session", {
      method: "POST",
      headers: {
         "Content-Type": "application/json"
      },
      body: JSON.stringify({
         mobile_no: phone,
         country_code: countryCode,
         api_key: process.env.API_KEY,
         secret: process.env.SECRET,
         user_name: res.locals.user.firstName
      })
   });

   const resData = await response.json();

   reverseotpMap.set(
    res.locals.user.email, {
      reverseOtpStatus : resData.status,
      message: resData?.msg,
      reverseotpSessionId : resData.data?.otp_session_id
    }
   )
   res.locals.user=undefined;
    
    
  

   res.status(200).json({
    status: resData.status,
    qrCode: resData.data?.secondary?.qr,
    intent: resData.data?.secondary?.intent
   });
}));

router.get("/session-status", isLoggedIn, catchAsync( async(req, res)=> {


    const reverseotpMapValue = reverseotpMap.get(res.locals.user.email);
  
    if (!["verified", "error","Invalid"].includes(reverseotpMapValue.reverseOtpStatus)){
 
      const response = await fetch("https://app.reverseotp.com/api/v1/check_otp_session",
       {method: "post",
       headers: { 
         "Content-Type": "application/json"
      },
       body: JSON.stringify({
        api_key: process.env.API_KEY,
        secret: process.env.SECRET,
        otp_session_id: reverseotpMapValue.reverseotpSessionId
       })
       }
      )
      const resData = await response.json()
    
   
      if (resData?.data) reverseotpMapValue.reverseOtpStatus = resData.data.status;
      if (resData?.status !== "success"){
        reverseotpMapValue.message = resData?.message;
       reverseotpMapValue.reverseOtpStatus = resData.status;
      }
       
      return res.status(200).json({
        status: reverseotpMapValue.reverseOtpStatus,
        message:reverseotpMapValue.message
      })
    }

    
    res.status(200).json({
      status: reverseotpMapValue.reverseOtpStatus,
      message: reverseotpMapValue.message
    })
}

))


router.post("/webhook/reverseotp",  (req, res) => {

   const signature = req.headers["x-reverseotp-signature"];

   if (signature !== process.env.WEBHOOK_SECRET) {
       return res.status(401).send("Unauthorized");
   }

   console.log("OTP verified: ",req.body);
});

module.exports = router;

