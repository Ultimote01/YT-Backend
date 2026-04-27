const express = require("express");
const bcrypt = require("bcrypt");
const fs = require("node:fs")
const { promisify } = require("util");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const { createAuthToken } = require("../utils/token");
const Email = require("../utils/email");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const router = express.Router();


let notifications = [{
      name: "email",
      message: "Please verify your email",
      action:{
        label: "Resend",
        route: "/auth/resend-email"
      }  
    }
  ] 

function setNotifications(user){
 
  if (!user.emailVerified){
  notifications.forEach(element => {
    user.notifications.push(element);
  });
}

 
 
  
}

const jwtToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPRIES_IN
  });
}; 




const sendToken = (user, statusCode, res, otpStatus) => {
   const token = jwtToken(user.id);   

  // if (process.env.NODE_ENV === "prod") cookieOptions.secure = true;
  user.active = undefined;
  user.password = undefined; 
 
  // res.cookie("jwt", token, cookieOptions);
  res.status(statusCode).json({
    status: otpStatus?? statusCode,
    token,
      user
  });
};

 


const isLoggedIn = catchAsync(async (req, res, next) => {
    
  const token =  req.headers.authorization?.split(" ")[1]?? "";
  try {
    // Check if the users are authenticated
    if (token) {
    
      // 2)  Verify the token
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
      );


      
      // 3) Check if the user still exist
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      } 
       
  
      // 4) Grant access to route
      res.locals.user = currentUser;
      return next();
    }
  } catch (err) {
    return next();
  }
  
  
  next();
}
);



router.post("/register",  catchAsync(async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 12);

  const user = await User.create({
    firstName: req.body.firstName,
    lastName: req.body?.lastName,
    email: req.body.email,
    passwordHash: hash
  });
  
  const param = Buffer.from("emailConfrim=true","utf-8").toString("base64");
  const url = `${req.protocol}://localhost:5173/verify/email/?j=${param}`;
  await new Email(user,url).send("", "Testing");

 
  
 setNotifications(user);

  user.passwordHash = undefined;
  user.id = undefined;
  sendToken(user, 201, res);
}
)
); 




router.post("/login",   catchAsync( async (req, res) => {
   const user = await User.findOne({ email: req.body.email });

  if (!user) return res.status(401).json({
    status:401,
    message: "Please provide a valid email & passsword"
  });

  const valid = await bcrypt.compare(req.body.password, user.passwordHash);
    

  if (!valid) return res.status(401).json({
    staus: 401,
    message: "Please provide a valid email & passsword"
  });

  if (user.twoFAEnabled ) {

    const preferred2FA = user.twoFAMethods.find((method)=> {
        if (method?.preferred) return true;
        return false;
    })

     
  console.log(preferred2FA.name);
    if (preferred2FA?.name === "Google Authenticator"){
     
    const tempToken = jwt.sign(
      { id: user._id, twoFA: true },
      process.env.JWT_SECRET, 
      { expiresIn: "5m" }
    );
    return res.status(200).json({ requires2FA: true, tempToken,
      method:preferred2FA?.name?? ""
      });
    } else if (preferred2FA?.name === "WhatsApp") {
      return res.status(200).json(
      { requires2FA: true,
      waMethodObject: preferred2FA,
      method:preferred2FA?.name?? ""
      });
    }  



  }

  
  user.passwordHash= undefined;
  user.id = undefined;
   
  setNotifications(user)
  sendToken(user, 200, res);
}
)
);



router.get("/verify", isLoggedIn, catchAsync( async (req, res , next)=> {
  const queryStringJ = Buffer.from( req.query.j ?? "", "base64").toString("utf-8");
  const emailVerified = queryStringJ === "emailConfirm-true" ? true : false;
  

  const user = await User.findOne({email: res?.locals?.user?.email});

  if (!user) return next( new AppError("Please visit the link sent to email from the device you are logged in", 401))


  if (emailVerified) return next( new AppError("The link is ivalid or expiried", 401));

  if (user.emailVerified) return next( new AppError("Email has already beeen verified",400));

  
  user.emailVerified = true;
  await user.save();


  notifications= notifications.filter((el)=> el.name !== "email")
  res.status(200).json({
      status: 200,
      message: "Email Verified"
    })


}))

router.get("/me/:id", catchAsync(async (req, res , next)=> {
     const user = await User.findById(req.params.id);

     user.passwordHash = undefined;
    res.status(200).json({
      user: setNotifications(user)
    });
}))


router.get("/resend-email", isLoggedIn,  catchAsync( async (req, res, next)=> {

  if (res.locals.user) {
    const param = Buffer.from("emailConfrim=true","utf-8").toString("base64");
    const url = `${req.protocol}://localhost:5173/verify/email/?j=${param}`;
    await new Email(res.locals.user,url).send("", "Testing");

    return res.status(200).json({
      staus: 200,
      message: "Email sent sucessfully "
    })
  }

  next( new AppError("", 500));
}))


router.post("/logout", isLoggedIn, catchAsync( async (req, res, next )=> {
   
 
  if (req.body?.preferredAuthMethod){
    
     if (req.body?.preferredAuthMethod === "none"){
      res.locals.user.twoFAMethods.forEach((method)=> {
        method.preferred = false;
        console.log(method);
        res.locals.user.twoFAEnabled =false;
      })
      
     }else{
        res.locals.user.twoFAMethods.forEach((method)=>{
          method.preferred = false;
        if (method.name === req.body?.preferredAuthMethod ) {
          method.preferred = true;
          res.locals.user.twoFAEnabled =true;
        }
     })
  
     }
   
      

  }

   
      if (req.body?.twoFAMethods) {
      for (let userMethod of req.body.twoFAMethods) {
        const twoFACreated = res.locals.user.twoFAMethods.some((method)=> {
        if (userMethod.name === method?.name)
        return true; return false; })

        if (!twoFACreated){
          res.locals.user.twoFAMethods.push({
            name: userMethod.name,
            preferred: false,
            country_code: userMethod.country_code,
            mobile_no: userMethod.mobile_no

          })
        } 
 
      }
        
    }

    await res.locals.user.save();
    res.locals.user=undefined;

   return res.json(204);
}))


module.exports = router;
module.exports.setNotifications = setNotifications;
module.exports.sendToken = sendToken;
module.exports.isLoggedIn =isLoggedIn;
 