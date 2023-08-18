
const passport = require('passport');
const UserModel = require('../models/User');
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
var LocalStrategy = require('passport-local');


passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.GOOGLE_CALL_URL}`,
      passReqToCallback: true,
    },
    async function (req, accessToken, refreshToken, profile, done) {
      try {
        const user = await UserModel.findOne(
          { email: profile.email },
          async function (err, userFound) {
            // if there is a user we check if they have a google id if not we update them
            if (userFound) {
              if (userFound.googleId == "") {
                const updateId = await UserModel.updateOne(
                  { _id: userFound._id },
                  { googleId: profile.id }
                ).clone().catch((error) => {
                  console.log(error);
                });

                return done(err, userFound);
              }
              return done(err, userFound);
            }

            //if there is not user with the email provided we create a user but with a role social login and some basic attributes,
            // he will choose the role in the front
            if (!userFound) {
              try {
                //because it a social login we do not have a password from the front so we make a temp password with his url id
                //plus a random number to make a temp password. After that the user can just forget password and make one for himself
                const urlId = nanoid(25) + Math.floor(Math.random() * 100);
                console.log(urlId)
                const hash = await bcrypt.hash(urlId, 10);

                //make a user with google info

                const newUser = await new UserModel({
                  email: profile.email,
                  password: hash,
                  urlId: nanoid(25),
                  role: "noRole",
                })
                newUser.save()
                //if there is not a user we pass err to done function and it redirects to failure url from google/callback route
                if (!userFound) return done(err);

                return done(err, newUser);

              } catch (err) {
                console.error(err);
                done(err);
              }
            }
          }
        ).clone();
      } catch (err) {
        console.log(err);
      }
    }
  )
);


passport.use(new LocalStrategy(function verify(username, password, cb) {
  
  db.get('SELECT * FROM users WHERE username = ?', [username], function (err, user) {
    if (err) { return cb(err); }
    if (!user) { return cb(null, false, { message: 'Incorrect username or password.' }); }

    crypto.pbkdf2(password, user.salt, 310000, 32, 'sha256', function (err, hashedPassword) {
      if (err) { return cb(err); }
      if (!crypto.timingSafeEqual(user.hashed_password, hashedPassword)) {
        return cb(null, false, { message: 'Incorrect username or password.' });
      }
      return cb(null, user);
    });
  });
}));
