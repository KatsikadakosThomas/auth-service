const mongoose = require("mongoose")

const UsersSchema = new mongoose.Schema({
    firstname:{
        type: String,
        // required:true
    },
    lastname:{
        type: String,
        // required:true
    },
    phone:{
        type:String
    },
    email:{
        type: String,
        required:true,
        unique: true,
        trim: true
    },
    password:{
        type: String,
        required:true
    },
    role:{
        type:String,
        default:"noRole"
    },
    approved:{
        type:Boolean,        
        default:false
    },
    salt:{
        type:String,
        // required: true
    },
    profilePic:{
        type:String,
        default:"/profile/default.png"
    },
    googleId:{
        type:String,
        default:""
    },
    urlId:{
        type:String,
        default:""
    }
},{timestamps:true})

const Users = mongoose.model("Users", UsersSchema)

module.exports = Users

