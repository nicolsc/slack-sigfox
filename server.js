'use strict';
require('./loadConfig');

const debug = require('debug')('slackbot-sigfox-last-message:app');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');

const SIGFOX =require('./modules/sigfox');
const auth = require('./modules/auth');

/* init */
const app = express();
const port = process.env.PORT || 34005;
const server = http.createServer(app);

if (!process.env.LOGIN || !process.env.PASSWORD || !process.env.SLACK_TOKEN || !process.env.SLACK_ROUTE){
  console.log("Missing auth credentials");
  process.exit(1);
}
app.use(bodyParser.urlencoded({extended:false}));
app.use("*", auth.basic);
app.use("*", auth.slack);


app.locals.moment = require('moment');

SIGFOX.init(process.env.SIGFOX_USERNAME, process.env.SIGFOX_PASSWORD);


server.listen(port);

app.post('/'+process.env.SLACK_ROUTE, function(req, res, next){
  debug('/last message route');
  debug('deviceid\t:\t'+req.body.text);
  
  
 
  SIGFOX.getDeviceMessages(req.body.text)
  .then(function(response){
    let message;
    if (!response || !response.data){
      message = null;
    }
    else{
      console.log(response.data);
      message = response.data.shift();
    }
    if (!message){
      next(new Error('No message found :( for '+req.body.text));
      return;
    }
    message.image = SIGFOX.getMessageStaticMap(message);
    message.linkQualityColour = SIGFOX.getLinkQualityColour(message);
    
    debug(message.image);
    res.json(SIGFOX.getSlackMessage(message));
  })
  .catch(function(err){
    next(new Error('An error occured while fetching messages - '+err.message));
  });
});


//404 handling
app.use(function(req, res, next) {
  debug('404');
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  debug(err);
  res.status(err.status || 500);
  res.json(SIGFOX.getSlackError(err));
});

server.on('error', function(err){
    debug('ERROR %s', err);
});
server.on('listening', function(){
 debug('Server listening on port %s', port); 
});