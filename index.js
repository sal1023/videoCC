var express = require('express');
var bodyParser = require("body-parser");
var multer = require('multer');
var app = express();

var request = require('request');
var FormData = require('form-data');
var fs = require('fs');

//for calling shell script
var sys = require('sys')
var exec = require('child_process').exec;

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(multer);


//var pass='letmeon';
//var url='https://api.dev.voicebase.com/services';
//var key='2A425147-7577-9542-3AED-4BCF806BB6EE';

var key='1586E668-F431-C9D6-D68B-88641B5C3EB8'
var pass='mrneutron';
var url=  "https://api.voicebase.com/services";
var callback="http://requestb.in/13o1igh1";
var eCallback="http://requestb.in/13o1igh1";
var scratchDir = '/tmp/';

app.use(express.static('public'));
//app.use('/static', express.static(__dirname + '/public'));

app.get('/', function(req, res){
  console.log(__dirname)
  res.sendFile(__dirname + '/index.html');
});


app.get("/generatecc", function (req, res) {
    //var fullUrl = req.protocol + '://' + req.get('host') + '/callback';
    //var fullUrl='http://requestb.in/uka2cruk';
    var fullUrl = 'http://73.252.201.186:3000/callback';
    var file = 'public/CaddyshackCinderella.mp4';
    //var audioFile = extractAudio(scratchDir,file);
    //uploadFile(audioFile,fullUrl,fullUrl);
    uploadFile(file,fullUrl,fullUrl);
    console.log('works, '+fullUrl);
    res.writeHead(200, {'Content-Type': 'text/plain' });
    res.end('getting srt');
});


app.post('/callback', function(req, res){
    //var path = url.parse(req.url).pathname;
    console.log('Callback, mediaId: ' + req.body.mediaId);
    res.writeHead(200, {'Content-Type': 'text/plain' });
    res.end('received callback');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


function uploadFile(file,callback,eCallback) {

   var formData = {apiKey: key,
                   password: pass,
                   version: '1.1',
                   action: 'uploadMedia',
                   transcriptType: 'machine-best',
                   file: fs.createReadStream(file),
                   machineReadyCallback:callback,
                   errorCallback:eCallback}
   request.post({
         url: url,
         formData: formData
         }, function(err, httpResponse, body) {
               if (err) {
                  return console.error('upload failed:', err);
               }
              console.log('Upload successful!  Server responded with:', body);
        }
    );
}

function extractAudio(scratchDir,file) {
   var ext = file.substr(file.lastIndexOf('.') );
   var audioFile = scratchDir+generateUUID()+ext;
   var cmd = 'ffmpeg -y -i '+file+ ' -vn -acodec copy '+audioFile;
   console.log(cmd);

   //var history = child_process.execSync('git log', { encoding: 'utf8' });
   //process.stdout.write(history);


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

