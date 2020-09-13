//jshint eversion6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate")

const app = express();

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({
    extended: true
}));
//creating a session
app.use(session({
    secret:"mysecret",
    resave:false,
    saveUninitialized: false,
    // cookie: { secure: true }
}));
//initializing pasport
app.use(passport.initialize());
app.use(passport.session());
//Connect to mongo DB
mongoose.connect("mongodb://localhost:27017/userDB",{useUnifiedTopology:true, useNewUrlParser:true});
mongoose.set('useCreateIndex', true);
//USER SCHEMA
const userSchema = new mongoose.Schema({
    email: String,
    secret: String,
    password: String,
    googleId: String,
   
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//Creating user model
const User = mongoose.model("User", userSchema);
passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/auth/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile)
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Get/rendering Home page to the screen
app.get("/",(req,res)=>{
    res.render("home")
});
//Google Oauth
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect:  "/login"}),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
    console.log("hureee")
  });
//Get/rendering Login page to the screen
app.get("/login",(req,res)=>{
    res.render("login")
});
//Get/rendering Register page to the screen
app.get("/register",(req,res)=>{
    res.render("register")
});
//Get secret page
app.get("/secrets",(req,res)=>{
    User.find(({"secret": {$ne:null}},(err, foundUser)=>{
        if(err){
            console.log(err)
            
        }else if(foundUser){
            console.log("yeey")
            res.render("secrets",{usersWithSecrets:foundUser})
        }
    }))
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("/login")
    //     console.log("not allowed")
    // }
});
//submit
app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login")
        console.log("not allowed")
    }
});
//logout
app.get("/logout",(req,res)=>{
    req.logOut();
    res.redirect("/")
})
//Registering user to the DB
app.post("/register",(req,res)=>{
    User.register({username: req.body.username},req.body.password,(err, user)=>{
        if(err){
            console.log(err);
            res.redirect("/register")
        }else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets")
                console.log("success")
            })
        }
    })
});
//user login
app.post("/login",(req,res)=>{
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,(err)=>{
        if(err){
            console.log(err)
        }else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets")
            });
        }
    })
    
});
//submit secret message
app.post("/submit",(req,res)=>{
    const submitSecret = req.body.secrets
    console.log(req.user.id);
    User.findById(req.user.id,(err, foundUser)=>{
        if(foundUser){
            foundUser.secret= submitSecret
            foundUser.save(()=>{
                res.redirect("/secrets")
            })
        }
    })
})


app.listen(3000,()=>{
    console.log("Now you can start working in peace not pieces!!!");
});

