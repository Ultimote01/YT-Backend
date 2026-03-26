const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");

const authRoutes = require("./routes/auth.routes");
const twofaRoutes = require("./routes/twofa.routes");
const errorController = require("./utils/errorController");

const app = express();

// Sanitzation against nosql injection
app.use(mongoSanitize());

// Sanitization against xss attacks
app.use(xssClean());

// Set security HTTP header
app.use(helmet());

// Prevent parameter pollution
app.use(hpp({
    whitelist: [
       "email"
    ]
  }));

// Limit request to api
const rateLimiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many request. Pleae try again in an hour"
});
app.use("/api", rateLimiter);

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token"
  ]
}));

app.options("*", cors());


// app.use((req, res, next)=>{
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
//     res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
//     next();
// })
app.use(express.json());

app.use((req, res, next)=> {
    console.log("Middleware Called")
    next();
})

 
app.use("/auth", authRoutes);
app.use("/2fa", twofaRoutes);

app.use("*", (req, res, next)=> {
   res.status(404).json({
    error: "Error found"
   })
})

app.use(errorController);

module.exports = app;
  