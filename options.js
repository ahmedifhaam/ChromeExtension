// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let page = document.getElementById('divApiConfig');
let updateBtn = document.getElementById('btnUpdateApiKey');
let api_key_txt = document.getElementById('txtApiKey');
let mappinsDV = document.getElementById('mappings');
let btnReset = document.getElementById('btnUpdate');
let REDMINE_API_KEY = "";
let trackers = "";
let projects = "";
var youtrack_workitemtypes = new Set();

let mappings = getDefaultMapping();

function getDefaultMapping(){
	return {'Dev - Testing': 9,'Development': 9,'Documentation' : 20, 'QA - Testing': 10,'Research' : 22};	
}

function update(){
	GetAllRedmineTrackers();
	getAllYouTrackProjects();
}


function getAPIKey(){
	chrome.storage.sync.get('apikey',function(data){
		REDMINE_API_KEY = data.apikey;
		if(REDMINE_API_KEY===undefined){
			alert("Please update your RedMine API key and retry.");
		}else{
			update();
		}
		
		
	});
}
getAPIKey();

chrome.storage.sync.get('maps',function(data){
		mappings = data.maps;
		if(mappings===undefined){
			mappings =getDefaultMapping();
		}
		syncMappings();
		console.log(mappings);
});


//renderMapppings();

function constructOptions() {
	$('#btnUpdateApiKey').click(function(){
		var key = api_key_txt.value;
		chrome.storage.sync.set({apikey:key},function(){
			REDMINE_API_KEY=api_key_txt.value;
			alert("Update API KEY as "+key+" ?");
			update();	
		});
	});

	$('#btnReset').click(function(){
		chrome.storage.sync.clear(function() {
			var error = chrome.runtime.lastError;
			if (error) {
				console.error(error);
			}
			update();
			location.reload(true);
		});
	})
	
}
constructOptions();


function renderMapppings(){
	
	/* chrome.storage.sync.get('maps',function(data){
		mappings = data; */
		
		
		
		var html="<table cellspacing=0; cellpadding=0;><tr><th>YouTrack Entry</th><th>Redmine Entry</th></tr>";
		var trackermap = getTrackersAsMap();
		for(var map in mappings){
			html+="<tr><td>"+map+"</td><td>"+trackermap[mappings[map]]+"</td></tr>";
		}
		html+="</table>";
		html+="<p class='subtitle'>Add a New Mapping or Update Existing Mappings</p>";
		html+="<span class='padding-x'>YouTrack</span>";
		html+="<select id='youtrackitem'>";
		html+=getyouTrackWorkItemAsOptions();
		html+="</select>";
		html+="<span class='padding-x'>RedMine</span>";
		html+="<select id='redmineitem'>";
		html+=getTrackersAsOptions();
		html+="</select>";
		html+="<button id='updatebtn'>Save</button>";
		
		mappinsDV.innerHTML = html;
		document.getElementById('updatebtn').addEventListener('click',addnewMapAndSync);
	//});
}

function addnewMapAndSync(){
	//alert(document.getElementById('youtrackitem').value + " $ "+ document.getElementById('redmineitem').value);
	mappings[document.getElementById('youtrackitem').value] =  document.getElementById('redmineitem').value;
	//mappings['test'] = document.getElementById('redmineitem').value;
	console.log(mappings);
	syncMappings();
}

function syncMappings(){
	chrome.storage.sync.set({maps: mappings},function(){
		console.log("Synced Successfully");
		
		console.log(mappings);
		renderMapppings();
	});
}

function GetAllRedmineTrackers(){
	  var reqUrl = "https://track.zone24x7.lk/enumerations/time_entry_activities.json?key="+REDMINE_API_KEY;
	  
	  var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		
		if (this.readyState == 4 && this.status == 200) {
			//alert(this.responseText);
			trackers = JSON.parse(this.responseText);
			//renderMapppings();
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.setRequestHeader("Access-Control-Allow-Origin","http://dev-app.us.kronos.com:81/")
	xhttp.send();
  }
  
  function getTrackersAsOptions(){
	  var html="";
	  if(trackers===undefined || trackers.time_entry_activities===undefined){
		return "";
		}
	  for(var tracker of trackers.time_entry_activities){
		  html+="<option value='"+tracker.id+"'>"+tracker.name+"</option>";
	  }
	  
	  return html;
  }
  
  function getTrackersAsMap(){
	  var map = {};
	  if(trackers===undefined || trackers.time_entry_activities===undefined){
		  return map;
	  }
	  for(var tracker of trackers.time_entry_activities){
		  map[tracker.id] = tracker.name;
	  }
	  return map;
  }
  
  function getyouTrackWorkItemAsOptions(){
	  var html="";
	  
	  for(var workitem of youtrack_workitemtypes){
		  html+="<option value='"+workitem+"'>"+workitem+"</option>";
	  }
	  
	  return html;
  }
  
  function getAllYouTrackProjects(){
	  var reqUrl ="http://dev-app.us.kronos.com:81/api/admin/projects/";
	  var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		
		if (this.readyState == 4 && this.status == 200) {
			//alert(this.responseText);
			projects = JSON.parse(this.responseText);
			GetAllYouTrackTrackers();
			
		}else if(this.status ==401){
			alert("Please Login to YouTrack!");
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();
  }
  
  function GetAllYouTrackTrackers(){
	  for(var project of projects){
		var reqUrl ="http://dev-app.us.kronos.com:81/api/admin/projects/"+project.id+"/timeTrackingSettings?fields=workItemTypes(name,url)";
		  var xhttp = new XMLHttpRequest();
			//alert('here');
		  xhttp.onreadystatechange = function() {
			
			if (this.readyState == 4 && this.status == 200) {
				for(var workitem of JSON.parse(this.responseText).workItemTypes){
					//alert(workitem);
					youtrack_workitemtypes.add(workitem.name);
				}
				renderMapppings();
			}
		  };
		
		xhttp.open("GET",reqUrl);
		xhttp.setRequestHeader("Accept", "application/json");
		xhttp.send();
	  }
	  
	  
  }