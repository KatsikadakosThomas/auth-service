const UserModel = require("../../models/User");
const DoctorController = require("../roles/doctor");
const PatientController = require("../roles/patient");
const CalendarModel = require("../../models/Calendar");
const PatientModel = require("../../models/Patients");
const DoctorModel = require("../../models/Doctor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var cookie = require("cookie");
const { nanoid } = require("nanoid");
const { roleFinder, roleSwitch } = require("../../services/roleFinder");
const sendEmail = require("../../services/email")
const crypto = require("crypto")

/*
Τι περιμενω απο front

body{
    user:{
    "firstname": "Akis",
    "lastname": "Akrivos",
    "email":"akis@gmail.com",
    "password":"123",
    "role":"admin",
    "salt":"vdfvsfdsfd"
    },
    // if doctor
    doctor:{

    }
    paramedics:{

    }
}
*/

module.exports = {
  //Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await UserModel.find({}).select(
        "firstname lastname email role profilePic"
      );
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({
        error: err,
      });
    }
  },

  //Get a user
  getOneUser: async (req, res) => {
    try {
      const user = await UserModel.findOne({ _id: req.params.userId }).select(
        "firstname lastname email role profilePic"
      );

      if (user) {
        res.status(200).json(user);
      } else {
        res.status(401).json({
          message: "That user does not exists",
        });
      }
    } catch (err) {
      res.status(500).json({
        error: err,
      });
    }
  },

  //Register User
  registerUser: async (req, res) => {
    try {
      const user = await UserModel.findOne({ email: req.body.email });

      if (user) return res.status(400).send({ message: "email exists" });

      //Generate salt to hast password
      const salt = await bcrypt.genSalt(10);
      req.body.salt = salt;

      //Hashed password
      req.body.password = await bcrypt.hash(req.body.password, salt);

      req.body.urlId = nanoid(25);

      const createUser = new UserModel(req.body);
      createUser.save().then((newUser) => {
        const msg = {
          to: req.body.email,
          from: " info@e-doctor.gr",
          subject: "E-doctor Verification mail",
          html: `<html>
                        <body >
                            <table width="100%" border="0" cellspacing="0" cellpadding="0"style="background-color:#0057B8;padding:30px;">
                                <tr>
                                    <td align="center">
                                        <div style="max-width:450px; height:100%; background-color:white;padding-bottom:100px;padding-top:20px;padding-right:40px;padding-left:40px;word-break: break-word;border-radius: 10px; border:2px solid rgb(255, 255, 255);box-shadow: 0 0 15px 0 #E2E9ED;">
                                            <img src="https://technaturegr.fra1.cdn.digitaloceanspaces.com/eDoctor/doctor-profile-with-medical-service-icon_617655-48.jpg" alt="Jobeat_logo" width="initial" height="150px">
                                            <h3>Καλωσήρθατε στo e-doctor!</h3>
                    
                                            <hr class="solid">
                                            <p>Παρακαλούμε πατήστε στο παρακάτω link για την έγκριση του λογαριασμού σας!</p>
                                            <a href="${process.env.API_URL}/user/register/approve/${newUser.urlId}">Επιβεβαίωση</a>
                                           
                                          
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </body>
                    </html>`,
        };

        const createCalendar = new CalendarModel({ _id: newUser._id });
        createCalendar.save();



        //Send confirmation email
        sendEmail(msg);

        return res.status(201).json({
          id: newUser._id,
          mail: "sended",
        });
      });
    } catch (err) {
      console.log(err);
      return res.status(400).send({ message: "something went wrong" });
    }
  },

  emailActivation: async (req, res) => {
    const urlId = req.params.urlId;
    UserModel.findOne({ urlId: urlId })
      .then((user) => {
        if (user) {
          user.approved = true;
          //   user.RegisterToken = Date.now();
          //   user.RegisterTokenExpire = Date.now();
          user.save();
          res.status(200).redirect(`${process.env.CLIENT_URL}/login`);
        } else {
          res.status(404).send("something went wrong");
        }
      })
      .catch((err) => {
        console.log(err);
        res.status(404).send("something went wrong");
      });
  },

  /**
   * @api {post} user/selectrole
   * @apiName account choice
   * @apiGroup user
   * @apiPermission -
   * @apiDescription account choice for new Users
   */
  selectRole: async (req, res) => {
    try {
      const role = req.body.role;

      //if we get a role other than what we want throw error
      if (roleSwitch(role)) return res.status(400).send({ message: "wrong role" });

      //Find user
      const user = await UserModel.findOne({ email: req.body.email });
      //we get the role from front and we assign the role number from env e.x (doctor will be 1349450)
      if (user.role !== "noRole")
        return res.status(400).send({ message: "Already a role" });

      user.role = roleFinder(role);
      //then update user with the code of the role
      user.save();

      //then create a document in the role collection
      const roleData = {};
      let userRole;
      switch (role) {
        case "doctor":
          roleData.user = user._id;
          roleData.internal = true;
          const createDoctor = new DoctorModel(roleData);
          userRole = await createDoctor.save();
          break;
        case "patient":
          roleData.user = user._id;
          const createPatient = new PatientModel(roleData);
          userRole = await createPatient.save();
          break;
        // case "admin":
        //     req.body.admin._id = user._id
        //     DoctorController.registerDoctor(req.body.doctor)
        //     break;
        case "eDoctor":
          roleData.user = user._id;
          DoctorController.registerDoctor(roleData);
          break;
        // case "paramedics":
        //     req.body.paramedics._id = user._id
        //     // ParamedicsController.registerParamedics(req.body.paramedics)
        //     break;
        // case "units":
        //     // UnitsController.registerUnits(req.body.units)
        //     break;
      }

      //userRole is the id of the role object of the use e.x doctor or patient
      const token = jwt.sign(
        {
          email: user?.email,
          userId: user?._id.toString(),
          role: user?.role,
          urlId: user?.urlId,
          userRoleID: userRole._id ? userRole?._id?.toString() : "",
        },
        process.env.TOKEN
      );

      res.setHeader(
        "Set-Cookie",
        cookie.serialize("token", token, {
          // ...(process.env.NODE_ENV === 'production' && { domain: 'jobeat.gr' }),
          domain: `localhost`,
          httpOnly: false,
          secure: false,
          sameSite: "lax",
          maxAge: 172800,
          path: "/",
        })
      );
      return res.status(200).json({
        data: { token },
      });
    } catch (error) {
      console.log(error);
      return res.status(400).send({ message: "something went wrong" });
    }
  },

  //Login User

  /**
   * @api {get} /auth/login the user
   * @apiName Login
   * @apiGroup Auth
   * @apiPermission User - Cookie
   * @apiDescription login
   */
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;
      let userRole = {};

      //Find user
      const user = await UserModel.findOne({
        email,
      });

      if (user.role == "95792003873") {
        userRole = await PatientModel.findOne({ user: user._id });
        console.log(userRole._id.toString());
      } else if (user.role == "67418256321") {
        userRole = await DoctorModel.findOne({ user: user._id });
      }

      if (user.approved === false)
        return res.status(400).send({ message: "not activated" });

      if (user) {
        //Check if passwords matches
        bcrypt.compare(password, user.password, function (err, hash) {
          if (hash) {
            if (user.role !== "noRole") {
              const token = jwt.sign(
                {
                  email: user?.email,
                  userId: user?._id.toString(),
                  role: user?.role,
                  urlId: user?.urlId,
                  userRoleID: userRole._id ? userRole?._id?.toString() : "",
                },
                process.env.TOKEN
              );

              res.setHeader(
                "Set-Cookie",
                cookie.serialize("token", token, {
                  // ...(process.env.NODE_ENV === 'production' && { domain: 'jobeat.gr' }),
                  domain: `localhost`,
                  httpOnly: false,
                  secure: false,
                  sameSite: "lax",
                  maxAge: 172800,
                  path: "/",
                })
              );
              return res.json({
                data: { token },
                success: "withRole",
              });
            } else {
              const token = jwt.sign(
                {
                  email: user.email,
                  userId: user._id.toString(),
                  role: "noRole",
                  urlId: user.urlId,
                },
                process.env.TOKEN
              );

              console.log(token);

              res.setHeader(
                "Set-Cookie",
                cookie.serialize("token", token, {
                  // ...(process.env.NODE_ENV === 'production' && { domain: 'jobeat.gr' }),
                  domain: `localhost`,
                  httpOnly: false,
                  secure: false,
                  sameSite: "lax",
                  maxAge: 172800,
                  path: "/",
                })
              );
              return res.json({
                data: { token },
                success: "noRole",
              });
            }
          } else if (err) {
            console.log(err);
          } else {
            res.status(401).json({
              message: "Wrong crendetials",
            });
          }
        });
      } else {
        res.status(401).json({
          message: "Wrong crendetials",
        });
      }
    } catch (err) {
      console.log(err);
      res.status(404).send("something went wrong");
    }
  },

  // Logout user
  logOut: async (req, res) => {
    res.clearCookie("token", {
      // domain:`localhost`,
      domain: process.env.DOMAIN,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 172800,
      path: "/",
    });
    res.end();
  },

  //Update User
  updateUser: async (req, res) => {
    console.log("UPDATE USER")
    console.log(req.body)
    console.log(req)
    try {
      const updateUser = await UserModel.findOneAndUpdate(
        { _id: req.params.userId },
        { ...req.body },
        { new: true }
      );
      console.log(updateUser);

      return res.status(201).json({
        data: updateUser,
      });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        error: err,
      });
    }
  },

  // Change user's password
  changePassword: async (req, res) => {
    try {
      // const decoded = jwt(req.session.jwt);
      const user = await UserModel.findOne({ _id: req.body.userId });
      if (user) {
        bcrypt.compare(
          req.body.oldPassword,
          user.password,
          function (err, matched) {
            if (err) {
              console.log(err);
            } else if (matched) {
              bcrypt.hash(req.body.newPassword, 12, function (err, newHash) {
                if (err) {
                  console.log(err);
                } else {
                  bcrypt.genSalt(12, function (err, salt) {
                    if (err) {
                      console.log(err);
                    } else {
                      user.password = newHash;
                      user.salt = salt;
                      user.save();
                      res.status(201).json({
                        message: "Password changed!",
                      });
                    }
                  });
                }
              });
            } else {
              res.json({
                errorMsg: "Old password is incorrect. Try again.",
              });
            }
          }
        );
      } else {
        res.status(404).json({
          message: "That user does not exists",
        });
      }
    } catch (err) {
      res.status(500).json({
        error: err,
      });
    }
  },

  forgotPassword: async (req, res, next) => {
    if (req.headers.cookie) return res.status(300).send("error")

    try {

      const user = await UserModel.findOne({ email: req.body.email })
      console.log(user)
      if (!user) return res.status(300).send("error")

      const buffer = crypto.randomBytes(32)

      const forgotToken = buffer.toString("hex");
      user.ForgotPasswordToken = forgotToken;
      user.ForgotTokenExpire = Date.now() + 3600000;
      user.save();
      const msg = {
        to: user.email,
        from: "",
        subject: "Edoctor - Password",
        html: `
                                   <h2>Edoctor - Password</h2>
                                   <p>Παρακαλούμε πατήστε στο παρακάτω link για την ανάκτηση του κωδικού σας</p> 
                                   <a href="${process.env.API_URL}/forgotpasswordchange/${user.ForgotPasswordToken}">Ανάκτηση</a>
                                   `,
      };

      //Send email for forgot password
      sendEmail(msg);

      return res.status(201).json({ message: "success", });


    } catch (error) {

      console.log(error)
      return res.status(400).send("error")
    }

  },

  //Get forgot password page from forgotpassword token
  forgotPasswordPage: (req, res, next) => {
    if (!req.session.jwt) {
      const id = req.params.id;
      UserModel.findOne({ ForgotPasswordToken: id })
        .then((user) => {
          if (user) {
            res.status(200).json({
              data: "Success!",
            });
          } else {
            res.status(404).json({
              noUser: "No user token found or has been expired!!",
            });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      res.status(401).json({
        alreadyLoggedin:
          "You are already loggedin please change your password from user panel",
      });
    }
  },

  //Put change Customer Password
  putChangeCustomerPassword: (req, res, next) => {
    if (!req.session.jwt) {
      const id = req.params.id;
      UserModel.findOne({ ForgotPasswordToken: id })
        .then((user) => {
          if (user) {
            bcrypt.genSalt(12, function (err, salt) {
              if (err) {
                console.log(err);
              } else {
                bcrypt.hash(req.body.password, 12, function (err, newHash) {
                  if (err) {
                    console.log(err);
                  } else {
                    user.salt = salt;
                    user.password = newHash;
                    user.ForgotPasswordToken = Date.now();
                    user.ForgotTokenExpire = Date.now();
                    user.save();
                    res.status(201).json({
                      data: "success",
                    });
                  }
                });
              }
            });
          } else {
            res.status(404).json({
              noUser: "No user token found or has been expired!!",
            });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      res.status(401).json({
        alreadyLoggedin:
          "You are already loggedin please change your password from user panel",
      });
    }
  },
};
