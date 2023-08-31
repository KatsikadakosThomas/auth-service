const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const passport = require('passport');

module.exports = {

    /**
 * @description First step for google auth api, runs code from /config/passport.js
 */
    Google: async (req, res, next) => {


        passport.authenticate("google", { scope: ["openid", "profile", "email"] })(req, res, next);
    },


/**
 * @description passport authenticate and redirect on fail, on success go to next()
 */
    GoogleCallback: async (req, res, next) => {
        try{
            passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/el/home` })(req,res,next)
        }
        catch(error){
            console.log("google login error: ", error)
        }
      
        },



/**
 * @description send cookie to frontend and login user, after success from a social login auth api
 */
    SocialSuccess: async (req, res, next) => {
    try{
         const user = req?.user
        console.log(user)
        const body = { userId: user?._id, email: user?.email, role: user?.role,urlId:user.urlId };
        // Sign the JWT token and populate the payload with the user email and id
        const token = jwt.sign(body, process.env.TOKEN);

        res.setHeader(
            'Set-Cookie',
            cookie.serialize('token', token, {
                // ...(process.env.NODE_ENV === 'production' && { domain: 'e-doctor.gr' }),
                domain: `localhost`,
                httpOnly: false,
                //  secure: (process.env.NODE_ENV === 'production'?true:false),
                sameSite: 'lax',
                maxAge: 172800,
                path: '/',
            }),
        );

         if(user.role==="noRole"){ return res.redirect(`${process.env.CLIENT_URL}/accountChoice`)}
        return res.redirect(`${process.env.CLIENT_URL}/profile`)
}
    catch(error){
            console.log("SocialSuccess error: ",error)
    }
           

    }
}

