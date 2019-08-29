// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';


let cont = document.getElementById('tp');
let issue_title = document.getElementById('issue_title');
let REDMINE_API_KEY = "";
let user = "";
let redmineuser = "";
let trackers = "";
let mappings = {};
let issueId = "";

let redmineinfoId = "";


function renderErrorOnTopBar(errormessage){
	var ulelement = $("<li></li>").text(errormessage);
	ulelement.fadeOut(8000);
	$("#error_top_bar").find("ul").append(ulelement);	
}

getAPIKey();

function getAPIKey(){
	chrome.storage.sync.get('apikey',function(data){
		REDMINE_API_KEY = data.apikey;
		if(REDMINE_API_KEY===undefined) renderErrorOnTopBar("RedMine entries will not be displayed without the API key.");
		getMaps();
	});
}


function getMaps(){
	chrome.storage.sync.get('maps',function(data){
		mappings = data.maps;
		if(mappings ===undefined) renderErrorOnTopBar("Mappings not found.");
		loaddata();
	});
}


function loaddata(){
	//show loader
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		issueId =  getIssueIdFromUrl(tabs[0].url);
		document.getElementById('issue_title').innerHTML = "<h3 style='display:inline'>"+issueId+"</h2>";
		GetAllTrackers(function(){
		  AssignUser(function(){
			  document.getElementById('issue_title').innerHTML+="<span class='name'><span class='text'>ZynK | Kronos FMSI &nbsp;&nbsp;</span> <img style='width:25px;height:25px;float:right' src='http://dev-app.us.kronos.com:81"+user.avatarUrl+"'></span>";
			  getWorkItemsForIssue(issueId);
			  getredmineissueIdforYouTrackissue(issueId);
		  });
		});
	});
	//end loader
}





function getIssueIdFromUrl(url){
	let hashindex = url.indexOf("#");
	let issueID = "";
	let start = url.indexOf("/issue/")+7;
	if(hashindex === -1){//hash found http://dev-app.us.kronos.com:81/issue/LT-1120#tab=Time%20Tracking
		issueID = url.substring(start)
	}else{//has not found http://dev-app.us.kronos.com:81/issue/LT-1120
		issueID = url.substring(start,hashindex);
	}
	return issueID;
}
  //get data from you track
  function getWorkItemsForIssue(issueId){
	var reqUrl = "http://dev-app.us.kronos.com:81/rest/issue/"+issueId+"/timetracking/workitem";
	var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		 
		if (this.readyState == 4 && this.status == 200) {
			//alert(this.responseText);
		  //document.getElementById('tp').innerHTML = 
		  renderWorkItems(this.responseText);
		}
		if(this.readyState ==4 && this.status ==401){
			console.log("Not Authenticated");
			renderErrorOnTopBar("Please refresh YouTrack page and try again!");
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();
  }
 
	//render data returned from you track
  function renderWorkItems(workitems){
	  var totalhours = 0;
	  workitems = JSON.parse(workitems);
	  var html = "<table cellspacing=0; cellpadding=0;>";
	  html+="<tr><th >Date</th><th>Hours</th><th>Work Item (YT)</th><th>Tracker (RM)</th><th>Update RedMine</th>";
	  //alert(workitems.length);
	  //for(workitem in workitems){
		for(var   workitem of workitems){
			var datelog = new Date(workitem.date);
		/* html = html+ "<tr><td><input type='checkbox' name='"+workitem.id+"' value='"+workitem.id+
		"'></td> */
		//lert("$"+user.login+"$"+workitem.author['login']);
		if(user.login === workitem.author['login']){
			var value = "Development"; //HARD CODED FOR NO TYPE TRACKER
			if(workitem.worktype && workitem.worktype!=null) value = workitem.worktype['name'];
			
			var body = {time_entry:{}};
			body.time_entry["spent_on"]=datelog.getFullYear()+"-"+("0"+(parseInt(datelog.getMonth())+1)).slice(-2)+"-"+("0"+datelog.getDate()).slice(-2);
			body.time_entry["hours"] = Math.floor(workitem.duration / 60);
			body.time_entry["worktype"] = workitem.worktype.name;
			body.time_entry["activity_id"] = parseInt(mappings[value]);
			body.time_entry["comments"] = workitem.description;
			html+= "<tr><td style='white-space:nowrap'>"+body.time_entry.spent_on
			+"</td><td>"+body.time_entry.hours+" h</td>"
			+"<td>"+body.time_entry.worktype+"</td>";
			/* +"<td>"
			+workitem.author['login']+"</td>"; */
			totalhours+= body.time_entry.hours;
			
			
			
			html+="<td><select class='trackerselect' >"+getTrackersAsOptions(mappings[value])+"</select></td><td style='text-align:center;'><button btnbody="+encodeURIComponent(JSON.stringify(body))+" class='btnsync refresh'><i class='fa fa-refresh'></i></button></tr>"
			
		}
		
	  }
	  //html+="<tr><td colspan=2>Total</td><td colspan=2>"+totalhours+"h</td></tr></table></p>";
	  html+="</table>";
	  $("#totalHours").text(totalhours+" h");
	  document.getElementById('tp').innerHTML = html;
	  for (var element of document.getElementsByClassName('btnsync')){
		element.addEventListener('click',function(){
			var tmp = JSON.parse(decodeURIComponent(this.getAttribute('btnbody')));
			//alert(this.getAttribute('btnbody'));
			createRedmineTimeEntry(tmp); 
		});  
	  }
	  
	  for(var selection of document.getElementsByClassName('trackerselect')){
		  selection.addEventListener('change',function(){
			  var btnup = this.parentNode.parentNode.lastChild.childNodes[0];
			  var btnbody = btnup.getAttribute('btnbody');
			  var btnBodyObj = JSON.parse(decodeURIComponent(btnbody));
			  btnBodyObj.time_entry.activity_id = parseInt(this.value);
			  btnup.setAttribute('btnbody',encodeURIComponent(JSON.stringify(btnBodyObj)));
		  });
	  }
	  
	  
}

var youtrackcounter = 1;
  
  //since issue ids are not mapped logically search for the youtrack id in title of redmine issue
  //from that get the id of redmine issue
  function getredmineissueIdforYouTrackissue(youtrackissueid){
	  var reqUrl = "https://track.zone24x7.lk/search.json?q="+youtrackissueid+"&titles_only=true"+
	  "&key="+REDMINE_API_KEY;
	  //alert(reqUrl);
	var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		 
		if (this.readyState == 4 && this.status == 200) {
			var resultObj = JSON.parse(this.responseText);
			if(resultObj.results.length>0){
				renderRedmineInfo(resultObj.results[0]);
				gettimeentryInfoFromRedmine(resultObj.results[0].id);
			}else{
				renderErrorOnTopBar("Please contact an authorized person to get a related issue created in RedMine.");
			}
			
		}
		if(this.readyState ==4 && this.status == 401){
			
				console.log("Reload the page and try again...");
			
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();
  }
  
  
  //after getting the redmine issue id 
  //to pouplate the time entries in redmine call this method 
  //this will call renderredmineTimeEntries internally to update the view
  function gettimeentryInfoFromRedmine(redmineissueId){
	  var reqUrl = "https://track.zone24x7.lk/time_entries.json?issue_id="+redmineissueId+"&user_id="+redmineuser.user.id+
	  "&key="+REDMINE_API_KEY;
	  var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		 
		if (this.readyState == 4 && this.status == 200) {
			renderredmineTimeEntries(JSON.parse(this.responseText));
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();
  }
  
  //this function is to render the title part of the redmine informations
  function renderRedmineInfo(redmineinfo){
	  redmineinfoId = redmineinfo.id;
		var html = "<i class='fa fa-link fa-sm icon' id='redmineissuelink'></i>";
	  document.getElementById('linkToRedMine').innerHTML = html;
	  $("#redmineissuelink").click(function(){
		  launchLink(redmineinfo.url);
	  })
  }
  function renderRedmineInfoError(){
	  var html = "<h3>Please contact an authorized person to get a related issue created in RedMine.</h3>";
	  document.getElementById('redmineinfo').innerHTML = html;
  }

  function launchLink(href){
	chrome.tabs.create({url: href});
  }
  
  
  function renderredmineTimeEntries(redmineTimeEntries){
	  var totalHours = 0;
	var html = "<table cellspacing=0; cellpadding=0;><tr><th>User</th><th>Hours</th><th>Date</th><th>Tracker</th><tr>";
	for(var timeEntry of redmineTimeEntries.time_entries){
		html+="<tr><td>"+timeEntry.user.name+"</td>";
		html+="<td>"+timeEntry.hours+" h</td>";
		html+="<td>"+timeEntry.spent_on+"</td>";
		html+="<td>"+timeEntry.activity.name+"</td>";
		html+="<tr>";
		totalHours+=timeEntry.hours;
	}
	html+= "</tr></table>";
	$("#redmineTotalHours").text(totalHours+" h");
	document.getElementById('redminetimeentries').innerHTML = html;
  }
  
  
  
  function getTrackersAsOptions(selectoption){
	  var html="";
	  
	  for(var tracker of trackers.time_entry_activities){
		  html+="<option";
		  if(tracker.id==selectoption) html+=" selected ";
		  html+=" value='"+tracker.id+"'>"+tracker.name+"</option>";
	  }
	  
	  return html;
  }
  
  function GetAllTrackers(callback){
	  var reqUrl = "https://track.zone24x7.lk/enumerations/time_entry_activities.json?key="+REDMINE_API_KEY;
	  
	  var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		
		if (this.readyState == 4 && this.status == 200) {
			//alert(this.responseText);
			trackers = JSON.parse(this.responseText);
			callback();
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();
  }
  
  function AssignUser(callback){
	  var reqUrl = "http://dev-app.us.kronos.com:81/api/admin/users/me?fields=login,fullName,avatarUrl";
	  var redmineUrl = "https://track.zone24x7.lk/users/current.json?key="+REDMINE_API_KEY;
	  var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		 
		if (this.readyState == 4 && this.status == 200) {
			//alert(this.responseText);
			user = JSON.parse(this.responseText);
			
			var xhttp2 = new XMLHttpRequest();
			
			xhttp2.onreadystatechange = function(){
				
				if (this.readyState == 4 && this.status == 200) {
					redmineuser = JSON.parse(this.responseText);
					callback(); 
				}
			} 
			
			xhttp2.open("GET",redmineUrl);
			xhttp2.setRequestHeader("Accept", "application/json");
			xhttp2.send();
			
		}
	  };
	
	xhttp.open("GET",reqUrl);
	xhttp.setRequestHeader("Accept", "application/json");
	xhttp.send();
  }
  
  function createRedmineTimeEntry(body){
		body.time_entry["issue_id"] = redmineinfoId;
		body.time_entry["custom_fields"]=[{"id":159,"value":"Green"}];
		
		//alert(body);
	  
	 var reqUrl = "https://track.zone24x7.lk/time_entries.json?key="+REDMINE_API_KEY;
	var xhttp = new XMLHttpRequest();
	
	  xhttp.onreadystatechange = function() {
		 
		if (this.readyState == 4 && this.status == 201) {
			//alert(this.responseText);
			renderErrorOnTopBar("Updated successfully");
			getredmineissueIdforYouTrackissue(issueId);
		}
	  };
	
	xhttp.open("POST",reqUrl,true);
	xhttp.setRequestHeader("Content-type", "application/json");
	xhttp.send(JSON.stringify(body)); 
	//alert(JSON.stringify(body));
	
	
	//sample body
	/* 
	{
	"time_entry":{
	"issue_id":90525,
	"hours": 7.5,
	"spent_on": "2019-08-02",
	"activity_id":9,
	"custom_fields":[
		{"id":159,"value":"Green"}
	],
	"comments":"Test with post"
	
	} 
	*/

  }
