const AppError = require("./appError");

const handleCastErrorDb = (err,next) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return  new AppError(message, 400);
};

const handleDuplicateFieldDB = (err,next) => {
  const value = err.keyValue?.email;
  const message = `Email already exist. Please log in`;
  return  new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = errors.join(". ");
  return new AppError(message, 400);
};

const handleJWTInvalidError = () => {
  return new AppError("Invalid token! Please log in  ", 401);
};

const handleJWTExpiredError = () => {
  return  new AppError("Token expired! Please  log in", 401);
};

const sendErrorDev = (req, res, err) => {
  // A) Chceck  if  url  is api route
  if (req.originalUrl?.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errStack: err.stack
    });
  }

  if (err.statusCode === 500){
  return res.status(err.statusCode)
  .json( {
    title: "Something went wrong ",
    message: "Internal Server Error"
  });
  }else {
    return res.status(err.statusCode)
    .json( {
    title: "Something went wrong ",
    message: err.message 
  });
  }
   
};

const sendErrorProd = (req, res, err) => {

  // B) Chceck  if  url  is api route
  if (req.originalUrl?.startsWith("/api")) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    // If not operational
    return res.status(500).json({
      status: "error",
      message: "Something went wrong"
    });
  }

  return res.status(err.statusCode)
    .json( {
    title: "Something went wrong ",
    message: err.message 
  });

};

function handleErrorType(error, req, res, env) {

   if  (error.name ===  "CastError") {
         error=handleCastErrorDb(error);
        
      }
  else if (error.code === 11000){
         error=handleDuplicateFieldDB(error);
        
      }
  else if (error.name === "ValidationError"){
      error=handleValidationErrorDB(error);
      
    }
    
  else if (error.name ===  "JsonWebTokenError"){
     error=handleJWTInvalidError();
    
    }
      
  else if (error.name === "TokenExpiredError" ) {
     error=handleJWTExpiredError();
    }

   if (env === "dev"){
  
          sendErrorDev(req,res,error);
    }else {
           
          sendErrorProd(req,res,error);
        }
    }


module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  console.log(err.code)
  

  if (process.env.NODE_ENV === "dev") {
    let error = { ...err };
    error.message = err.message;
    
    handleErrorType(err, req, res, "dev");
   
    
   
 
    
  } else if (process.env.NODE_ENV === "prod") {
    let error = { ...err };
    error.message = err.message;
    handleErrorType(err, req, res, "prod");
     
   
   
   
     
  }
};
