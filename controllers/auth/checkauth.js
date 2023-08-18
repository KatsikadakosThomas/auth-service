
const User = require("../../models/User")
const jwt = require("jsonwebtoken");

module.exports = {

/**
 * @data It needs cookie token from Authorization header
 * @description verifies a cookie decodes it and find user from the decoded id
 * @returns status 200 and user {email,role} or status 400 with no user string
 */
    checkAuth: async (req,res) => {
    let userRole = null
    const cookie = req.headers.cookie

    if(!cookie){
        const error = new Error("Not authenticated!!!")
        error.statusCode = 401;
        res.send("Not authenticated!");
        throw error;
    }


    try{
        decodedToken = jwt.verify(cookie, process.env.TOKEN);
    }
    catch(err){
        err.statusCode = 500;
        res.status(400).send("Invalid token");
        throw err;
    }
    if(!decodedToken){
        const error = new Error("Not authenticated.!")
        error.statusCode = 401;
        throw error;
    }

    const user = await User.find({_id:decodedToken.userId}).select("email role id urlId")
    if(user[0].role == "95792003873"){
        userRole = await PatientModel.findOne({user: decodedToken.userId})
       
    }else if (user[0].role == "67418256321"){
        userRole = await DoctorModel.findOne({user: decodedToken.userId})
    }

    const data = {
        email: user[0].email,
        role: user[0].role,
        _id: user[0]._id,
        urlId: user[0].urlId,
        userRoleID: userRole?._id.toString()
    }

   return user ? res.status(200).json(data) : res.status(400).send("no user")


    },

/**
 * @data It needs cookie token from Authorization header
 * @description verifies a cookie decodes it and find user from the decoded id
 * @returns status 200 and user {email,role} if the role is admin or status 400 with no user admin
 */

    checkAdmin: async (req,res) => {

        const cookie = req.headers.cookie
    
        if(!cookie){
            const error = new Error("Not authenticated!!!")
            error.statusCode = 401;
            res.send("Not authenticated!");
            throw error;
        }
    
        try{
            decodedToken = jwt.verify(cookie, process.env.TOKEN);
        }
        catch(err){
            err.statusCode = 500;
            res.status(400).send("Invalid token");
            throw err;
        }
        if(!decodedToken){
            const error = new Error("Not authenticated.!")
            error.statusCode = 401;
            throw error;
        }
    

    
        const user = await User.find({_id:decodedToken.userId}).select("email role ")

       return user[0].role==process.env.ADMIN_ROLE?res.status(200).json(user):res.status(400).send("no admin")
    
    
        }


}

