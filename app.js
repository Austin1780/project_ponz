const express = require("express");
const app = express();
const User = require("./models/user");
//const addUser = require("./addUser");

// ----------------------------------------
// Passport
// ----------------------------------------

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
app.use(passport.initialize());

// ----------------------------------------
// App Variables
// ----------------------------------------
app.locals.appName = "The Ponz Project";

// ----------------------------------------
// Express Sessions
// ----------------------------------------

const expressSession = require("express-session");
app.use(passport.session());

// ----------------------------------------
// Mongoose
// ----------------------------------------
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/project_ponz");
app.use((req, res, next) => {
  if (mongoose.connection.readyState) {
    next();
  } else {
    require("./mongo")().then(() => next());
  }
});

// ----------------------------------------
// ENV
// ----------------------------------------
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ----------------------------------------
// Body Parser
// ----------------------------------------
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------------------------------
// Sessions/Cookies
// ----------------------------------------
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");

app.use(cookieParser());
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "secret"]
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ----------------------------------------
// Flash Messages
// ----------------------------------------
const flash = require("express-flash-messages");
app.use(flash());

// ----------------------------------------
// Method Override
// ----------------------------------------
const methodOverride = require("method-override");
const getPostSupport = require("express-method-override-get-post-support");

app.use(
  methodOverride(
    getPostSupport.callback,
    getPostSupport.options // { methods: ['POST', 'GET'] }
  )
);

// ----------------------------------------
// Referrer
// ----------------------------------------
app.use((req, res, next) => {
  req.session.backUrl = req.header("Referer") || "/";
  next();
});

// ----------------------------------------
// Public
// ----------------------------------------
app.use(express.static(`${__dirname}/public`));

// ----------------------------------------
// Logging
// ----------------------------------------
const morgan = require("morgan");
const morganToolkit = require("morgan-toolkit")(morgan, {
  req: ["cookies" /*, 'signedCookies' */]
});

app.use(morganToolkit());

// ----------------------------------------
// Local Strategy
// ----------------------------------------

passport.use(
  new LocalStrategy(function(email, password, done) {
    User.findOne({ email }, function(err, user) {
      if (err) return done(err);
      if (!user || !user.validPassword(password)) {
        return done(null, false, { message: "Invalid email/password" });
      }
      return done(null, user);
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// ----------------------------------------
// Routes
// ----------------------------------------
app.get("/", async (req, res) => {
  try {
    if (req.session.passport && req.session.passport.user) {
      let currentUser1 = await User.findById(req.session.passport.user);
      //.deepPopulate("childIds.childIds.childIds.childIds.childIds.childIds.childIds.childIds");
      currentUser = await currentUser1.populateChildren();
      res.render("welcome/index", {
        currentUser: currentUser
      });
    } else {
      res.redirect("/login");
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register/:referral", (req, res) => {
  let path = req.params.referral;
  res.render("register", { path });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  })
);

app.post("/register/:referral", async (req, res) => {
  const { fname, lname, email, password } = req.body;
  const parentId = req.params.referral;
  //await addUser(fname, lname, email, password, parentId);
  if (parentId === "0") {
    const user = new User({ fname, lname, email, password });
    await user.save(err => {});
  } else {
    const user = new User({ fname, lname, email, password, parentId });
    await user.save(async err => {
      await user.addPoints();
      await User.findByIdAndUpdate(parentId, {
        $push: { childIds: user._id }
        //$inc: { depth: 1 }
      });
    });
  }
  res.redirect("/login");
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("login");
});

// ----------------------------------------
// Template Engine
// ----------------------------------------
const expressHandlebars = require("express-handlebars");
const helpers = require("./helpers");

const hbs = expressHandlebars.create({
  helpers: helpers,
  partialsDir: "views/",
  defaultLayout: "application"
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

// ----------------------------------------
// Server
// ----------------------------------------
const port = process.env.PORT || process.argv[2] || 3000;
const host = "localhost";

let args;
process.env.NODE_ENV === "production" ? (args = [port]) : (args = [port, host]);

args.push(() => {
  console.log(`Listening: http://${host}:${port}\n`);
});

if (require.main === module) {
  app.listen.apply(app, args);
}

// ----------------------------------------
// Error Handling
// ----------------------------------------
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.stack) {
    err = err.stack;
  }
  res.status(500).render("errors/500", { error: err });
});

module.exports = app;
