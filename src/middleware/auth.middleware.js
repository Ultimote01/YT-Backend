const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
 
  if (!token) return res.status(401).json(
    {
      status: 401,
      message: "Login to complete process"
    }
  );

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch(err) {
    console.log(err);
    res.status(403);
  }
};
