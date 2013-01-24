var DASHJS_VERSION = "0.5a";
var dashInstance;
var playbackTimePlot;

var extCount;
var myMPD;
var segNotAvailable;
var countSegmentRequest;
var requestDate;
var extContentType;
var maxCount;
var tOffset;
var firstSegment;
var segmentDuration;

function updatePlaybackTime()
{
    playbackTimePlot.update(dashInstance.videoTag.currentTime, 2);
    window.setTimeout(function () { updatePlaybackTime(); },100);
    
}

function DASH_MPD_loaded()
{
	
	console.log('MPD Loaded: entering function DASH_MPD_loaded()...');
	myBandwidth = new bandwidth(bps, 1.1, 0.9);
   
	myMPD = dashInstance.mpdLoader.mpdparser.pmpd;
	segNotAvailable = 0;
	countSegmentRequest = 0;
	
	maxCount = 300;
	
	segmentDuration = myMPD.period[0].group[0].segmentTemplate.duration;
	var numS = Math.floor(checkDate(myMPD.availabilityStartTime) / segmentDuration);
	console.log("CheckDate(): "+checkDate(myMPD.availabilityStartTime));
	console.log("Possibile numero segmento: "+numS);
	if(numS<=0) {
		numS=1;
	}
	extCount = numS;
	console.log("extCount = "+extCount);
	tOffset = -((numS - 1)*segmentDuration);
	console.log("tOffset = "+tOffset);
	firstSegment = true;
	
	adaptation = init_rateBasedAdaptation(dashInstance.mpdLoader.mpdparser.pmpd, dashInstance.videoTag, myBandwidth);
	
	/*
   	myFplot = new fPlot(document.getElementById("graph").getContext("2d"),parsePT(dashInstance.mpdLoader.mpdparser.pmpd.mediaPresentationDuration),document.getElementById("graph").width,document.getElementById("graph").height);
 	myFplot.initNewFunction(0);
	myFplot.initNewFunction(1);
    	myFplot.initNewFunction(2); // the current playback time
    	playbackTimePlot = myFplot;
	myBandwidth.addObserver(myFplot);
	
	adaptation.addObserver(myFplot);*/
	adaptation.switchRepresentation(); // try to get a better representation at the beginning
	
	//funzionante con 10,16 e 1000
	console.log("minBufferTime: " + parsePT(myMPD.minBufferTime));
	overlayBuffer = init_mediaSourceBuffer("0",0,parsePT(myMPD.minBufferTime),0,dashInstance.videoTag);
	dashInstance.overlayBuffer = overlayBuffer;
 	
	//qui avviene l'attach del mediaSource al tag video
    /* new MSE ... */
    var URL = window.URL || window.wekitURL;
    if(window.WebKitMediaSource != null){
        window.MediaSource = window.WebKitMediaSource;
    }
    var MSE = new window.MediaSource();
    dashInstance.MSE = MSE;
    dashInstance.videoTag.src = URL.createObjectURL(MSE);

	
	
	console.log("MPD availabilityStartTime: "+myMPD.availabilityStartTime);
	
    dashInstance.MSE.addEventListener('webkitsourceopen', onOpenSource, false);
	dashInstance.MSE.addEventListener('sourceopen', onOpenSource, false);

	dashInstance.MSE.addEventListener('webkitsourceended', onSourceEnded);
	dashInstance.MSE.addEventListener('sourceended', onOpenSource, false);
	
	dashInstance.MSE.addEventListener('seeked', onSeek, false);
	
	overlayBuffer.addEventHandler(function(fillpercent, fillinsecs, max){ console.log("Event got called from overlay buffer, fillstate(%) = " + fillpercent + ", fillstate(s) = " + fillinsecs + ", max(s) = " + max); });
    

   	//window.setTimeout(function () { updatePlaybackTime(); },100);

    
}

function DASHPlayer(videoTag, URLtoMPD)
{
	console.log("DASH-JS Version: " + DASHJS_VERSION);
	dashInstance = this;
	this.videoTag = videoTag;
	initDASHttp('no-cache');
	this.mpdLoader = new MPDLoader(DASH_MPD_loaded);
	this.mpdLoader.loadMPD(URLtoMPD);
	//myBuffer = init_timeBuffer(2,10,0,video);
	//video.addEventListener('progress', , false);
}


/*
* Ritorna la differenza in secondi tra l'ora corrente e l'inizio della trasmissione live (passata come parametro)
*/
function checkDate(startTime) {
	
	var parseDateI = startTime.split("T");
	
	var parseDate = parseDateI[0].split("-");
	var parseTime = parseDateI[1].split(":");
	
	var startDate = new Date( parseDate[0], parseDate[1], parseDate[2], parseTime[0], parseTime[1], parseTime[2], null);
	var now = new Date();
	
	var d1 = startDate.getTime();
	var d2 = now.getTime();
	
	if (d1==d2) {
		return 0;
	} else if (d1>d2) {
	
		var diffS = now.getSeconds() - startDate.getSeconds();
		var diffM = (now.getMinutes() - startDate.getMinutes())*60;
		var diffH = (now.getHours() - startDate.getHours())*3600;
		
		return diffS + diffM + diffH;
		
	} else {
		return -1;
	}
	
}