const mongoose = require("mongoose");
const dotenv = require("dotenv");

const app = require("./src/app");

dotenv.config({"path": `${__dirname}/config.env`});


const db = process.env.MONGO_URI.replace("<db_password>", process.env.DB_PASSWORD);


mongoose.connect(db)
  .then(() => {
    console.log("Database connected successfully.")
  });

   const server = app.listen(process.env.PORT, () =>
      console.log(`Server running on ${process.env.PORT}`)
    );


process.on("unhandledRejection", err => {
  console.log(err.name, err.message);
  console.log(`Uncaught Rejection. Shutting down...`);
  // process.exit(1);
  server.close(); 
});  

// This would catch unhandled synchronous error
process.on("uncaughtException", err => {
  console.log(err.name, err.message);
  console.log("Unhandled Exception. Shutting Down..");
  server.close();
});
 