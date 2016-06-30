var basicAuth = require('basic-auth');
var debug = require('debug')('slackbot-sigfox-last-message:debug');
var SIGFOX = require('./sigfox');
exports.basic = function(req, res, next) {
    var credentials = basicAuth(req);
  
  if (!credentials || credentials.name !== process.env.LOGIN || credentials.pass !== process.env.PASSWORD) {
    debug("Bad credentials ☹", credentials);
//    debug(process.env.LOGIN);
//    debug(process.env.PASSWORD);
//    debug("LOGIN ?", (credentials.name !== process.env.LOGIN));
//    debug("PASSWORD ?", (credentials.pass !== process.env.PASSWORD));
//    debug(req.body);
    res.status(401);
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    res.json(SIGFOX.getSlackError({message:'Invalid credentials'}));
    return false;
  }
  debug("Credentials OK");
  next();
};

exports.slack = function(req, res, next){
  debug(req.headers);
  
  if (!req.body.token || req.body.token !== process.env.SLACK_TOKEN){
    debug("Invalid slack token");
    debug(req.body);
    res.status(401);
    
    res.type('json');res.json(SIGFOX.getSlackError({message:'Invalid Slack Token'}));
    return false;
  }
  debug("Slack token OK");
  if (!req.body.text || !req.body.text.match(/^([0-9A-F]*)$/gi)){
    
    debug("Invalid device id");
    debug(req.body.text);
    res.status(400);
    
    res.json(SIGFOX.getSlackError({message:'Invalid device ID'}));
    return false;
  }
  next();
  
};