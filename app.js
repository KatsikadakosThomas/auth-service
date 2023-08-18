require("dotenv").config({
  path:
    process.env.NODE_ENV === "development"
      ? ".env.development"
      : ".env.production",
});
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const {chalk} = require("chalk");
const cors = require("cors");
const compression = require("compression");
const passport = require("passport");

const{default:helmet}= require("helmet");
const morgan = require('morgan');


var app = express();
const PORT = process.env.PORT;


app.use(compression());
app.use(morgan(":date[clf] :remote-addr :method :status  :url :response-time"));
app.use(passport.initialize());
app.use(helmet())
app.use(logger('dev'));
app.use(cors({
  origin:["http://localhost:6000","http://localhost:3000","http://localhost:5000"],
  methods:"GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials:true
}))


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);


module.exports = app
