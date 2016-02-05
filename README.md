# Sample App to get machine generated closed captions (SRT) using voicebase API

## Overview

This is a simple video steaming app that shows how to use the VoiceBase REST APIs to get machine generated transcripts and closed captions.
	
   * for demo purposes videos are streamed from node.  All files in public folder are streamable.
   * Very simple home page with links to each file in public folder
   * Player page uses JWPlayer to stream the file selected
   * Player page has "generate closed caption" button, that will use the VoiceBase API to get an SRT for the video and copy to the demo server so that it can be displayed  in jwplayer 

UI is very basic at this time.  Goal is show how to use the API to get the SRT file.  Additional limitation is that there is no notificaton on the web page when the srt has been downloaded and placed in correct location for the player.  So  you need to refresh the web page and try and turn on the CC in the player to see the results.  Or you can look at server console.

## Prerequisites

   * ffmpeg should be insalled and in path.  App will use ffmpeg to extract the audio to save bandwidth.
   * You will need a VoiceBase API account
   * Machine that runs this app must receive a callback from voicebase when transcript is ready, so it must have a public IP
   
## Setting up the app

   * Run `npm install` at the root folder to download dependencies.
   * install ffmpeg if you do not already have it installed
   * copy one or more mp4 files to public folder 
   * Run `node app.js --vbtoken <your-token-here>` to start the application.
   * Navigate to http://localhost:3000/ or http://yourserver:3000/  in your favourite browser.

## Configuration

There are 4 config variables

   * baseurl: Thie baseurl is for the VoiceBase REST API and the default value should be fine as is (in config,json)
   * vbtoken: You will need to get your own VoiceBase Bearer token and specify it either as command line (--vbtoken <your-token-here>) or set an env var of same name 
   * callback: If the machine you are running this on does not have a public IP, it is possible to use port forwarding on your router, but then you might also have to override the callback url.  By default, the demo app will use the same base url that you use for the web app for the callback.   If you are port forwarding, you may need to use a local IP for your browser and then override the url with the public url for the callback.
   * scratchDir: The scratchdir is where tmp files will be placed and is set to /tmp as a default
   
## References 

   * VoiceBase REST API (add link)


## Code Example

This is code to upload a file specifying a callbackUrl and externalId.

```javascript
function uploadFile(file, externalId, callbackUrl, res, callback) {

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
              callback(err, res, body);
        }
    );
}
```

This is example code for handling the callback POST and extracting the SRT data and writing it to a file.

```javascript
app.post('/callback2', textParser, function(req, res){
    data = JSON.parse(req.body);
    x = data.media.metadata.external.id;
    fileName = req.body.metadata.external.id;
    fs.writeFile('public/'+fileName+'-en.srt', data.media.transcripts.srt, function(err) {
        if(err) {
            return console.log(err);
        }
    }); 
    console.log('callback receievd with external id: '+fileName);
});

```

This is example code showing how to extract the audio from a video without transcoding usin ffmpeg.

```javascript
// uses ffmpeg to extract the audio track (without transcoding) from a video file.  This will be more efficient then sending the entire video
function extractAudio(scratchDir,fileName,res) {
   var file = 'public/'+fileName;
   var ext = file.substr(file.lastIndexOf('.') );
   var audioFile = scratchDir+generateUUID()+ext;
   var cmd = 'ffmpeg -y -i '+file+ ' -vn -acodec copy '+audioFile;
   var child = exec(cmd, function(err, stdout, stderr) {
        if (err !== null) {
            return console.log('exec error: ' + err);
        }  
        externalId=fileName;
        afterAudioExtracted(audioFile,externalId, res);
   });
}

```
