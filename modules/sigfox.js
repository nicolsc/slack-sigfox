var request = require('request-promise');
var debug = require('debug')('slackbot-sigfox-last-message:sigfox');
var moment = require('moment');

var SIGFOX = {
  _username : undefined,
  _password : undefined,
  _apiRoot : 'https://backend.sigfox.com/api/',
  init: function(username, password){
    this._username = username;
    this._password = password;
  },
  getDeviceMessages: function(deviceId){
    return this._apiCall('devices/'+deviceId+'/messages');
  },
  getBaseStation: function(baseStationId){
    return this._apiCall('basestations/'+baseStationId);
  },
  _apiCall: function(url){
    return new Promise(function(resolve, reject){
      debug('API Call — '+this._apiRoot+url);
      request.get(this._apiRoot+url, {
        json:true,
        auth:{
          user: this._username,
          pass: this._password
        }
      })
      .then(resolve)
      .catch(reject);
      
    }.bind(this));
  },
  isValidDeviceId: function(deviceId){
    return /^([0-9a-fA-F]{2,10})$/.test(deviceId);
  },
  getStaticMap: function(params){
    var defaultParams = {
      size: '600x400',
      type: 'terrain'
    };

    if (!params){
      params = defaultParams;
    }
    Object.keys(defaultParams).forEach(function(key){
      if (typeof params[key] === 'undefined'){
        params[key] = defaultParams[key];
      }
    });

    var uri = 'https://maps.googleapis.com/maps/api/staticmap?maptype={mapType}&size={size}&';

    uri = uri.replace('{mapType}', params.type);
    uri = uri.replace('{size}', params.size);

    if (params.zoom){
      uri += "&zoom="+params.zoom;
    }

    if (params.center){
      uri += '&center='+this.getTextCoord(params.center);
    }

    return uri;
  },
  getMessageStaticMap: function(message, params){
    if (!message || !message.rinfos || !message.rinfos.length){
      return null;
    }

    var markersColors = ["black", "brown","purple", "yellow", "blue", "gray", "orange", "red", "white"];
    
    var uri = this.getStaticMap(params);
    message.rinfos.forEach(function(baseStation, idx){
      if (typeof baseStation.lat === 'undefined' || typeof baseStation.lng === 'undefined'){
        debug('Base station location unknown');
        debug(baseStation);
        return;
      }
      uri += '&markers=size:mid%7ccolor:'+markersColors[idx%markersColors.length]+'%7C'+this.getTextCoord(baseStation);
    }.bind(this));

    if (message.rinfos.length < 3){
      uri += "&zoom=9";
    }

    //2048 chars max
    // + cut at the last & to avoid incomplete params leading to unpredictable stuff, such as misplaced markers
    return (uri+'&');//.substring(0,2048).replace(/\&([^\&])*$/, '');
  },
  getTextCoord: function(latLng){
    if (!latLng || typeof latLng.lat==='undefined' || typeof latLng.lng==='undefined' || latLng.lat===null || latLng.lng===null){
      return null;
    }
    return latLng.lat+','+latLng.lng;
  },
  getLinkQualityColour(message){
    if (!message || !message.linkQuality){
      return "#CCCCCC";
    }
    switch(message.linkQuality.toUpperCase()){
        case "EXCELLENT":
          return "#028C7E";
        case "GOOD":
          return "good";
        case "AVERAGE":
          return "warning";
        case "LIMIT":
          return "danger";
        default:
          return "#3333F0";
    }
  },
  getSlackMessage(message){
    return {
      text: "Sigfox device *"+message.device+"*",
      attachments: [
        {
            title:"Last message received "+moment(message.time*1000).fromNow(),
            color:message.linkQualityColour,
            text:"Received by "+message.rinfos.length+" base stations\nLinkQuality : "+message.linkQuality
        },
        {
          fallback:"Image not found ☹",
          image_url:message.image
        }
      ]
    };
  },
  getSlackError(error){
    debug("Error");
    debug(error);
    if (error.status == 404){
      error.message = "Unknown device";
    }
    return {
      title:"Error ☹",
      text: error ? (error.message ? error.message : "error "+error.status) : "Unknown error"
    };
  }
};

module.exports = SIGFOX;