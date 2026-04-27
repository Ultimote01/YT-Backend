const express = require("express");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");


const User = require("../models/user");
const auth = require("../middleware/auth.middleware");
const { setNotifications , sendToken , isLoggedIn} = require("../routes/auth.routes");
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

  if (!verified){ 

    user.twoFAMethods.forEach((method)=>{

      if ( req.body?.method === method?.name){
        if (method.preferred === true) user.twoFAEnabled= false;
      }
    })

     user.twoFAMethods= user.twoFAMethods.filter((method)=>
      req.body?.method !== method?.name
     )
     console.log()
     user.save();
    return res.status(200).json({ message: "Invalid token" });
  }

  

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



const sendOtp = catchAsync(async (req, res) => {   
   const { mobile_no, country_code, user_name} = req.body;

   const response = await fetch("https://app.reverseotp.com/api/v1/create_otp_session", {
      method: "POST",
      headers: {
         "Content-Type": "application/json"
      },
      body: JSON.stringify({
         mobile_no: mobile_no,
         country_code: country_code,
         api_key: process.env.API_KEY,
         secret: process.env.SECRET,
         user_name: res.locals?.user?.firstName?? user_name
      })
   });

   const resData = await response.json();

   console.log(resData);
   res.locals.user=undefined;
   res.status(200).json({
    status: resData.status,
    qrCode: resData.data?.secondary?.qr,
    intent: resData.data?.secondary?.intent,
    message: resData?.msg,
   otp_session_id : resData.data?.otp_session_id
   });

})

const checkSessionStatus = catchAsync( async(req, res)=> {

      const response = await fetch("https://app.reverseotp.com/api/v1/check_otp_session",
       {method: "post",
       headers: { 
         "Content-Type": "application/json"
      },
       body: JSON.stringify({
        api_key: process.env.API_KEY,
        secret: process.env.SECRET,
        otp_session_id: req.body.otp_session_id
       })
       }
      )
      const resData = await response.json();

      if (resData?.data?.status === "verified" & req.originalUrl === "/2fa/session-status-auth"){

          
        const user = await User.findOne({email: req.body.email});
      

        setNotifications(user);
        sendToken(user,200,res,  resData.data?.status?? resData?.status);
    
      }

  
      res.locals.user = undefined;

      
      return res.status(200).json({
        status: resData.data?.status?? resData?.status,
        message:resData?.message
      })
}

)


router.post("/send-otp",  isLoggedIn , sendOtp );
router.post("/session-status", isLoggedIn,  checkSessionStatus);

router.post("/send-otp-auth", sendOtp );
router.post("/session-status-auth", checkSessionStatus);



router.post("/webhook/reverseotp",  async (req, res) => {

   const signature = req.headers["x-reverseotp-signature"];

   if (signature !== process.env.WEBHOOK_SECRET) {
       return res.status(401).send("Unauthorized");
   }
   console.log(req.body)

});

module.exports = router;

