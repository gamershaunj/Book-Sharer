const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const date = require('date-and-time');

const app = express();  

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));

app.use(passport.initialize()); 
app.use(passport.session());



mongoose.connect("mongodb+srv://admin_shaun:test321@cluster0-fi5rg.mongodb.net/userDB",{ useNewUrlParser: true , useUnifiedTopology: true, useFindAndModify: false })

const messageSchema = new mongoose.Schema({
  msg: String,
  msgDate: String,
  recipient: String,
  sender: String
});

const Message = new mongoose.model("Message",messageSchema);

const userSchema = new mongoose.Schema({
  username : String,
  password: String,
  inputbooks: String,
  outputbooks: String,
  date        : String,
  messages : [messageSchema]
})

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User',userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());
 
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",function(req,res){
  res.render("cover");
});

app.get("/register",function(req,res){
  res.render("register",{success:""});
})

app.post("/register",function(req,res){
  const userName = req.body.username;
  const passWord = req.body.password;
  
  User.register({username:userName}, passWord, function(err, user){
    if (err){
      res.render("register",{success:"This username is already registered"});
    }
    else{
      passport.authenticate("local")(req,res,function(){
        let Name = user.username;
        req.session.Name = Name;
        res.redirect("/dashboard");
      })
    }
  })
})

app.get("/login",function(req,res){
  res.render("login");
})

app.post("/login",function(req,res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user,function(err){
    if (err){
      console.log(err)
    }
    else{
      passport.authenticate("local")(req,res,function(){
        let Name = user.username;
        req.session.Name = Name;
        res.redirect("/dashboard");
      })
    }
  })

})

app.get("/dashboard",function(req,res){
  const Name = req.session.Name
  if (req.isAuthenticated()){
    User.findOne({username: Name },function(err,user){
      res.render("dashboard",{User: user, Messages: user.messages});
    })
    
  }
  else{
    res.redirect("cover");
  }
});

app.post("/dashboard",function(req,res){
  
  const now = new Date();
  const pattern = date.compile('MMM DD YYYY hh:mm A');
  const datestr = date.format(now, pattern);                  // => 'Fri, Jan 02 2015 06:08 PM'
  let Name = req.session.Name;
  const books = {
    inputbooks: req.body.inputbooks,
    outputbooks: req.body.outputbooks,
    date        : datestr
  }

  User.findOneAndUpdate({username: Name},books,function(err,user){
    if (err){
      console.log(err);
    }
    else{
      console.log(user);
    }
  })
  res.redirect("/books");
})

app.get("/books",function(req,res){
  User.find(function(err,users){
    res.render("books",{ Users : users});
  })
  
})

app.post('/message',function(req,res){
  
  const now = new Date();
  const pattern = date.compile('MMM DD YYYY hh:mm A');
  const datestr = date.format(now, pattern);              // => 'Fri, Jan 02 2015 06:08 PM'
                  
  const msg = req.body.msg;
  const recipient = req.body.rName;
  const sender = req.session.Name;
  const message = new Message({
    msg: msg,
    msgDate: datestr,
    recipient: recipient,
    sender: sender
  })
  message.save();
  User.findOne({username: recipient},function(err,user){
    if (user){
      user.messages.push(message);
      user.save();
    }
    else{
      console.log("user not found");
    }

  })
  res.redirect("/books");
})

app.listen(process.env.PORT || 3000,function(){
    console.log("Server running");
})
