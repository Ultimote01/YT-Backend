const mongoose = require("mongoose");

const twoFAMethod = new mongoose.Schema({
  name:String,
  preferred:{
    type: Boolean,
    default: false
  }
})

const notification = new mongoose.Schema({
  name: String,
  message: String,
  action: {
    label: String,
    route: String
  }
})


const UserSchema = new mongoose.Schema({
  firstName:String,
  lastName:String, 
  email: { type: String, unique: true },
  passwordHash: String,
  twoFAEnabled: { type: Boolean, default: false },
  twoFASecret: String,
  backupCodes: [String],
  balance: String,
  accountNumber: String,
  emailVerified: {
    type: Boolean,
    default: false
  },
 notifications: [notification],
 twoFAMethods: [twoFAMethod],
 signOutTime: {
  type: Date
 },
 createdAt: {
    type: Date,
    default: Date.now()
 }
});
 


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
} 

UserSchema.pre("save", function(next){
 let accountNumber = "";
 const balanceList = ["29,765,89", "9,876,54","785,342,08","432,876,23", "7,342,11","87,245,99"];
 for (let x=0; x < 10; x++) {
      accountNumber += `${getRandomInt(1,9)}`
    }

  const balance = balanceList[getRandomInt(0,4)];

  this.accountNumber = accountNumber;
  this.balance = balance;

next();
}) 




module.exports = mongoose.model("User", UserSchema);
 