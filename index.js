var express = require('express');
var bodyParser = require("body-parser");
var app = express();
var fs = require('fs');

var request = require('request');
var sys = require('sys')
var exec = require('child_process').exec;

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

var pass='letmeon';
var url='https://api.dev.voicebase.com/services';
var key='2A425147-7577-9542-3AED-4BCF806BB6EE';
//var key='1586E668-F431-C9D6-D68B-88641B5C3EB8'
//var pass='mrneutron';
//var url=  "https://api.voicebase.com/services";
//var callback="http://requestb.in/13o1igh1";
//var eCallback="http://requestb.in/13o1igh1";
var scratchDir = '/tmp/';

//Workaround to have thos global because I can not retriee the callback params :(
var mediaId;
var srt;
var fileName="putThatCoffeeDown.mp4";


//io.on('connection', function (socket) {
  //socket.emit('news', { hello: 'world' });
  //socket.on('my other event', function (data) {
    //console.log(data);
  //});
//});


app.get('/', function(req, res){
  console.log(__dirname)
  res.sendFile(__dirname + '/index.html');
});


app.get("/cc", requestSRT); 

function requestSRT(req, res) {
    var fullUrl = req.protocol + '://' + req.get('host') + '/callback';
    //var fullUrl='http://requestb.in/uka2cruk';
    //var fullUrl = 'http://73.252.201.186:3000/callback';
    var file = 'public/'+fileName;
    //var audioFile = extractAudio(scratchDir,file);
    //uploadFile(audioFile,fullUrl,fullUrl);
    uploadFile(file, fullUrl,fullUrl, res, afterUpload);
    //var data = {"mediaId":"xxxx","requestStatus":"SUCCESS","fileUrl":"xxxxx"};
    //res.json(data);
    //res.send(data);
}

function afterUpload(err, res, data) {
    //var data = {"mediaId":"xxxx","requestStatus":"SUCCESS","fileUrl":"xxxxx"};
    res.json(data);
}


app.post('/callback', function(req, res){
    var d = new Date();
    var n = d.toLocaleTimeString();
    console.log('a callback was received at : ' + n);
    //TODO:  Can not get the 3 post parameters.  Not sure why
    //console.log('state : ' + req.body.state);
    //console.log('mediaId : ' + req.body.mediaId);
    //`console.log('time charged : ' + req.body.timeCharged);

   // get the closed caption SRT file and write it to the public folder so it can be used in the video    
   getSRT(mediaId);

});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


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
              mediaId=body.mediaId;
              callback(err, res, body);
        }
    );
}

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
              srt = body;
              fs.writeFile("public//captions-en.srt", srt, function(err) {
                  if(err) {
                      return console.log(err);
                  }
                  console.log("The file was saved!");
              }); 
        }
    );
}

function extractAudio(scratchDir,file) {
   var ext = file.substr(file.lastIndexOf('.') );
   var audioFile = scratchDir+generateUUID()+ext;
   var cmd = 'ffmpeg -y -i '+file+ ' -vn -acodec copy '+audioFile;
   console.log(cmd);
   var child;
   child = exec(cmd, function (error, stdout, stderr) {
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if (error !== null) {
         console.log('exec error: ' + error);
       }  
   });

  return audioFile;
}

function uploadFile2(file,callback,eCallback) {
  request.post({
        url: url,
        method: 'POST',
        form: {apiKey: key,
               password: pass,
               version: '1.1',
               action: 'uploadMedia',
               transcriptType: 'machine-best',
               //file:file,
               file: fs.createReadStream(file),
               machineReadyCallback:callback,
               errorCallback:eCallback}
        },function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
            }
        }
    );
}

function generateUUID(){
       var d = new Date().getTime();
       var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
           var r = (d + Math.random()*16)%16 | 0;
           d = Math.floor(d/16);
           return (c=='x' ? r : (r&0x3|0x8)).toString(16);
       });
       return uuid;
}

