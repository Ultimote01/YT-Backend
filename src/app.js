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

// app.use(cors({
//   origin: "https://yt-banking-app-cgao.vercel.app/",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: [
//     "Content-Type",
//     "Authorization",
//     "X-CSRF-Token"
//   ]
// }));

// app.options("*", cors());

const allowedOrigins = ['https://yt-banking-app-cgao.vercel.app', 'http://localhost:3000']; // Add your local and Vercel domains

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization',"X-CSRF-Token"], // Specify allowed headers
  credentials: true // If  cookies or sessions
}));

// Handle OPTIONS requests explicitly if needed (browsers send these as preflights)
app.options('*', cors());


app.use(express.json());

app.use((req, res, next)=> {
    console.log("Middleware Called")
    next();
})

 
app.use("/auth", authRoutes);
app.use("/2fa", twofaRoutes);

app.all("*", (req, res, next)=> {
   res.status(404).json({
    error: "Error found"
   })
})

app.use(errorController);

module.exports = app;
  