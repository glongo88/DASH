/*
 * DASHttp.js
 *****************************************************************************
 * Copyright (C) 2012 - 2013 Alpen-Adria-Universität Klagenfurt
 *
 * Created on: Feb 13, 2012
 * Authors: Benjamin Rainer <benjamin.rainer@itec.aau.at>
 *          Stefan Lederer  <stefan.lederer@itec.aau.at>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published
 * by the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston MA 02110-1301, USA.
 *****************************************************************************/
 
 var _timeID = 0;
 var _tmpvideo;
 var _cacheControl;
 
function DASHttp()
{
	
	
}


// this method is used by the mediaSourceBuffer to push segments in
function _push_segment_to_media_source_api(buffer, data)
{
    console.log("DASH-JS client: appending data of length: " + data.length + " to the Media Source Buffer with id: "+ buffer.id);
    sourceBufferAppend(dashPlayer.MSE, buffer.id, data);
   
}

function _fetch_segment(presentation, url, video, range, buffer)
{
	console.log('DASH JS Client fetching segment: ' + url);
	var xhr = new XMLHttpRequest();
	xhr.timeID = _timeID;
	xhr.open('GET', url, true);
	xhr.setRequestHeader('Cache-Control', _cacheControl);

	if(range != null)
	{
		xhr.setRequestHeader('Range', 'bytes='+range);
		console.log('DASH JS Client fetching byte range: ' + range);
	}
    
	xhr.responseType = 'arraybuffer';
	
	//_tmpvideo = video;
	xhr.onload = function(e)
   		 {

     			data = new Uint8Array(this.response);
    			mybps = endBitrateMeasurementByID(this.timeID,data.length);
    			myBandwidth.calcWeightedBandwidth(parseInt(mybps));
    			adaptation.switchRepresentation();
    			    
			    _push_segment_to_media_source_api(buffer, data);
    			    
			    if(extCount==300) video.webkitSourceEndOfStream(HTMLMediaElement.EOS_NO_ERROR);
        
   		 };
	
	beginBitrateMeasurementByID(this._timeID);
	_timeID++;
	xhr.send();
}


function _fetch_segment_for_buffer(presentation, url, video, range, buffer)
{
    console.log('DASH JS Client fetching segment: ' + url);
	var xhr = new XMLHttpRequest();
	xhr.timeID = _timeID;
	xhr.open('GET', url, true);
	xhr.setRequestHeader('Cache-Control', _cacheControl);
	if(range != null)
	{
		xhr.setRequestHeader('Range', 'bytes='+range);
		console.log('DASH JS Client fetching byte range: ' + range);
	}
	
	xhr.responseType = 'arraybuffer';
	xhr.buffer = buffer;
	//_tmpvideo = video;
	xhr.onload = function(e)
	{
		
		if(xhr.status == 404) {
		
			segNotAvailable = 1;
			requestDate = new Date();
			
		} else {
			
			countSegmentRequest = 0;
			
			data = new Uint8Array(this.response);
			mybps = endBitrateMeasurementByID(this.timeID,data.length);
			myBandwidth.calcWeightedBandwidth(parseInt(mybps));
			
			adaptation.switchRepresentation();      // <--- mod this, if you wanna change the adaptation behavior ... (e. g., include buffer state, ...)
			
			// push the data into our buffer - 2 sono secondi
			buffer.push(data, 2);
			
			if(extCount==300) buffer.streamEnded = true;
			
			buffer.callback();
		}
		
	};
	
	beginBitrateMeasurementByID(this._timeID);
	_timeID++;
	xhr.send();
	
}


				
function _dashSourceOpen(buffer, presentation, video, mediaSource)
{
	// check the parsed mpd
	// fetch a representation and check whether selfinitialized or ...
		
	console.log('Entering _dashSourceOpen()...');
	video.width = presentation.width;
	video.height = presentation.height;
	
	extContentType = presentation.mimeType + '; codecs="' + presentation.codecs + '"';
	console.log("DASJ-JS: content type: " + extContentType);
	//viene creato un sourceBuffer per il mediaSource
	addSourceBuffer(mediaSource, buffer.id, extContentType);
	
	console.log("extCount = "+extCount);
	
	if(presentation.hasInitialSegment == false)
	{
		console.log("myMPD.period[0].group[0].segmentTemplate.initialization = "+myMPD.period[0].group[0].segmentTemplate.initialization);
        baseURL = presentation.baseURL;
		//qui viene caricato il segmento; la URL è formata da baseUrl+segmento
		_fetch_segment(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + myMPD.period[0].group[0].segmentTemplate.initialization, video, null, buffer);
				
	}else{
		baseURL = presentation.baseURL;
		//qui viene caricato il segmento; la URL è formata da baseUrl+segmento
		_fetch_segment(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + adaptation.getInitialChunk(presentation).src, video, adaptation.getInitialChunk(presentation).range, buffer);
		//presentation.curSegment++;
	}
			
}

function _dashFetchSegmentBuffer(presentation, video, buffer)
{
	console.log("extCount = "+extCount);
	if(extCount==300) {
        return; 
    }
    baseURL = presentation.baseURL;
	
	if(myMPD.period[0].group[0].segmentTemplate!=undefined) {
		_fetch_segment_for_buffer(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + myMPD.period[0].group[0].segmentTemplate.media.replace("$Number%03$", extCount), video, null, buffer);
		extCount++;
	} else {
		_fetch_segment_for_buffer(presentation, (baseURL != 'undefined' ? presentation.baseURL : '') + adaptation._getNextChunkP(presentation, presentation.curSegment).src, video, adaptation._getNextChunk(presentation.curSegment).range, buffer);
		presentation.curSegment++;
	}

}


function _dashFetchSegmentAsynchron(buffer, callback)
{
	_dashFetchSegmentBuffer(adaptation.currentRepresentation, adaptation.mediaElement, buffer);
}
 
 
function initDASHttp(cacheControl)
{
	_timeID = 0;
	_cacheControl = cacheControl;
	
}