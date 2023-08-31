var express = require('express');
var router = express.Router();
const { Google, GoogleCallback, SocialSuccess, AccountChoice } = require('../controllers/auth/google');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

//Google auth
router.get("/google/login/",Google)

router.get("/google/callback",GoogleCallback , SocialSuccess)


module.exports = router;
