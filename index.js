var express = require('express');
var bodyParser = require("body-parser");
var app = express();
var fs = require('fs');
var request = require('request');
var sys = require('sys')
var exec = require('child_process').exec;
var http = require('http').Server(app);
var nconf = require('nconf');

// Setup nconf to use (in-order): commandline, env, congig.json file
nconf.argv()
   .env()
   .file({ file: 'config.json' });

// create application/json parser 
var jsonParser = bodyParser.json({type:'text/plain'});
var urlencodedParser = bodyParser.urlencoded({ extended: true });
var textParser = bodyParser.text();
var rawParser = bodyParser.raw();

app.use(express.static('public'));
app.set('view engine', 'jade');

var bearerToken = nconf.get('vbtoken');
var baseUrl = nconf.get('baseurl');
var callbackOverride = nconf.get('callback');
var scratchDir = nconf.get('scratchdir');
//'https://apis.voicebase.com/v2-beta/'
//'/tmp/';

console.log('baseurl: ' + baseUrl);
console.log('vbtoken: ' + bearerToken);
console.log('callback: ' + callbackOverride);
console.log('scratchDir: ' + scratchDir);

//Workaround to have thos global because I can not retriee the callback params :(
//var callbackUrl = 'http://73.252.201.186:3000/callback';

function endsWith(str) {
    var suffix='.mp4';
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

app.get('/', function (req, res) {
  var files=fs.readdirSync('public');
  var filteredFiles = files.filter(endsWith);
  res.render('index', { title: 'Hey', files: filteredFiles});
});


app.get('/player', function (req, res) {
  var file = req.param('file');
  fileName = file;
  res.render('player', { file:file });
});


//
// Sequence of calls to trigger request for SRT, the results will be ready when POST is received on the callback url
//  get("/cc")  calls
//     requestSRT which calls extractAudio
//     extractAudio() -- extracts audio from the video, using shell command to run ffmpeg, when it is done calls afterExtarctAudio function.
//     afterExtractAudio() -- calls upload which does the POST, when then when POST is complete calls afterUpload function
//  afterUpload() sends response to web client that did the get to /cc
//
app.get("/cc", requestSRT); 
function requestSRT(req, res) {
    var callbackUrl = req.protocol + '://' + req.get('host') + '/callback';
    if (callbackOverride) {
        callbackUrl=callbackOverride;
    }
    //console.log(callbackUrl);
    //TODO: Get the filename from the request (and not use the global var)
    var audioFile = extractAudio(scratchDir,fileName,res);
}

// uses ffmpeg to extract the audio track (without transcoding) from a video file.  This will be more efficient then sending the entire video
function extractAudio(scratchDir,fileName,res) {
   var file = 'public/'+fileName;
   var ext = file.substr(file.lastIndexOf('.') );
   var audioFile = scratchDir+generateUUID()+ext;
   var cmd = 'ffmpeg -y -i '+file+ ' -vn -acodec copy '+audioFile;
   //console.log(cmd);
   var child = exec(cmd, function(err, stdout, stderr) {
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (err !== null) {
            return console.log('exec error: ' + err);
        }  
        externalId=fileName;
        afterAudioExtracted(audioFile,externalId, res);
   });
}

//after extraction is done, use REST api to upload the audio (note the callbackUrl to get notified when it is ready)
function afterAudioExtracted(audioFile, externalId, res) {
    uploadFileV2(audioFile,externalId, callbackUrl, res, afterUpload);
}

// after uploading, send the response back to web page, with the results from REST call 
function afterUpload(err, res, data) {
    //console.log(data);
    res.json(data);
}


//
// File upload functions (these examples use media file attachment, it is also possible to provide url to media file)
//

// v2 upload file function.
//   note it posts the file to media along with optional configruation spec that includes thing such as the callback url, externalId, what processing is needed.
//   if spec is not included, all default config  settings are used.
function uploadFileV2(file, externalId, callbackUrl, res, callback) {

   var config=    {configuration:{
                         publish: {
                            callbacks: [
                                {url : callbackUrl,
                                 method : "POST",
                                 include : [ "transcripts", "keywords", "topics", "metadata" ] }
                            ]
                         }
                   } 
               }; 
   var metadata = {metadata : { external : {id : externalId} } }
   var formData = { media: fs.createReadStream(file), configuration: JSON.stringify(config), metadata: JSON.stringify(metadata)};

   request.post({
         url: baseurl+'media',
         json: true,
         formData: formData,
         headers: {'Authorization': 'Bearer '+bearerToken },
         }, function(err, httpResponse, body) {
               if (err) {
                  return console.error('upload failed:', err);
               }
              console.log('Upload successful!  Server responded with:', body);
              //for (var prop in body ) {
              //    console.log( prop + ' is ' + body[prop] );
              //}
             callback(err, res, body);
        }
    );
}

// v1 upload media function
//   one difference with v2 is that all control parameters are passed in as form data whereas v2 has the config spec
function uploadFile(file,callbackUrl,eCallbackUrl,res,callback) {

   var formData = {apiKey: key,
                   password: pass,
                   version: '1.1',
                   action: 'uploadMedia',
                   transcriptType: 'machine-best',
                   file: fs.createReadStream(file),
                   machineReadyCallback:callbackUrl,
                   errorCallback:eCallbackUrl}
   request.post({
         url: url,
         json: true,
         formData: formData
         }, function(err, httpResponse, body) {
               if (err) {
                  return console.error('upload failed:', err);
               }
              console.log('Upload successful!  Server responded with:', body);
              for (var prop in body ) {
                  console.log( prop + ' is ' + body[prop] );
              }
              //callback function to do the the work when this processing is done
              callback(err, res, body);
        }
    );
}


// v1 function to retrieve the srt file given an mediaID
function getSRT(mediaId) {

   var formData = {apiKey: key,
                   password: pass,
                   version: '1.1',
                   action: 'getTranscript',
                   format: 'srt',
                   mediaId: mediaId,
                   content:'True'}
   request.post({
         url: url,
         formData: formData
         }, function(err, httpResponse, body) {
               if (err) {
                  return console.error('upload failed:', err);
               }
              console.log('Upload successful!  Server responded with:', body);
              fs.writeFile('public/'+fileName+'-en.srt', body, function(err) {
                  if(err) {
                      return console.log(err);
                  }
              }); 
        }
    );
}


//
//Upload callbacks, url specified when media file is posted to media url
//

//v2 callback code
//   Note one difference with v1, is that v2 also can receive data (as specified in publish section of the configuration provide at media POST time)
app.post('/callback', textParser, function(req, res){
    data = JSON.parse(req.body);
    x = data.media.metadata.external.id;
    //console.log(data.media.transcripts.srt);
    //fileName = req.body.metadata.external.id;
    fs.writeFile('public/'+fileName+'-en.srt', data.media.transcripts.srt, function(err) {
        if(err) {
            return console.log(err);
        }
    }); 
    console.log('callback receievd with external id: '+fileName);
});

//v1 callback code
//  Note one difference with v2, is that it has to make a request to get the srt data.  callback is just a notifier. 
app.post('/callbackv1', textParser, function(req, res){
    console.log('state : ' + req.body.state);
    console.log('mediaId : ' + req.body.mediaId);
    console.log('time charged : ' + req.body.timeCharged);
    console.log('externalId : ' + req.body.externalId);

   // get the closed caption SRT file and write it to the public folder so it can be used in the video    
   getSRT(req.body.mediaId);

});


function generateUUID(){
       var d = new Date().getTime();
       var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           var r = (d + Math.random()*16)%16 | 0;
           d = Math.floor(d/16);
           return (c=='x' ? r : (r&0x3|0x8)).toString(16);
       });
       return uuid;
}

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
