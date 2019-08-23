// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let page = document.getElementById('buttonDiv');
const kButtonColors = ['#3aa757', '#e8453c', '#f9bb2d', '#4688f1'];
let updateBtn = document.getElementById('UPDATE_API_KEY');
let api_key_txt = document.getElementById('TXT_API_KEY');
let mappinsDV = document.getElementById('mappings');
let REDMINE_API_KEY = "";
let trackers = "";
let projects = "";
var youtrack_workitemtypes = new Set();

let mappings = {};

/* chrome.storage.sync.set({maps:''},function(){
	alert("Cleared");
}); */

/* chrome.storage.sync.clear(function() {
    var error = chrome.runtime.lastError;
    if (error) {
        console.error(error);
    }
}); */

chrome.storage.sync.get('apikey',function(data){
	REDMINE_API_KEY = data.apikey;
	if(REDMINE_API_KEY===undefined){
		alert("Please update your Redmine API key and retry");
	}else{
		GetAllRedmineTrackers();
		getAllYouTrackProjects();
	}
	
	
});

chrome.storage.sync.get('maps',function(data){
		mappings = data.maps;
		if(mappings===undefined){
			mappings ={};
		}
		console.log(mappings);
});


function constructOptions() {
	updateBtn.addEventListener('click',function(){
		var key = api_key_txt.value;
		chrome.storage.sync.set({apikey:key},function(){
			alert("Update API KEY as "+key);
		})
	});
	
  /* for (let item of kButtonColors) {
    let button = document.createElement('button');
    button.style.backgroundColor = item;
    button.addEventListener('click', function() {
      chrome.storage.sync.set({color: item}, function() {
        console.log('color is ' + item);
      })
    });
    page.appendChild(button);
  } */
}
constructOptions();


function renderMapppings(){
	
	/* chrome.storage.sync.get('maps',function(data){
		mappings = data; */
		
		
		
		var html="<table><tr><th>You Track Entry</th><th>Redmine Entry</th></tr>";
		var trackermap = getTrackersAsMap();
		for(var map in mappings){
			html+="<tr><td>"+map+"</td><td>"+trackermap[mappings[map]]+"</td></tr>";
		}
		html+="</table>";
		html+="<p>Select New Mapping or Update Existing</p>";
		html+="<select id='youtrackitem'>";
		html+=getyouTrackWorkItemAsOptions();
		html+="</select>";
		html+="<select id='redmineitem'>";
		html+=getTrackersAsOptions();
		html+="</select>";
		html+="<button id='updatebtn'>Add/Update</button>";
		
		mappinsDV.innerHTML = html;
		document.getElementById('updatebtn').addEventListener('click',addnewMapAndSync);
	//});
}

function addnewMapAndSync(){
	//alert(document.getElementById('youtrackitem').value + " $ "+ document.getElementById('redmineitem').value);
	mappings[document.getElementById('youtrackitem').value] =  document.getElementById('redmineitem').value;
	//mappings['test'] = document.getElementById('redmineitem').value;
	console.log(mappings);
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
	  
	  for(var tracker of trackers.time_entry_activities){
		  html+="<option value='"+tracker.id+"'>"+tracker.name+"</option>";
	  }
	  
	  return html;
  }
  
  function getTrackersAsMap(){
	  var map = {};
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
			alert("Please Login ");
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