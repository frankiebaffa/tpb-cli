progRun();

function progRun(){
	const curl = require("curl");
	const jsdom = require("jsdom");
	const torr  = require('webtorrent');
	const readline = require('readline-sync');
	const fs = require('fs');
	const video = '/0/99/200';
	const other = '/0/99/600';
	const music = '/0/99/100';
	const all = '/0/99/0';
	var info = ['','','','',''];
	var infoNum = 0;
	const path = process.env.TORR_PATH;
	if(path===undefined){
		console.log("TORR_PATH is undefined.");
		process.exit();
	};

	var searchType = '';
	var isType = false;
	while(isType==false){
		console.clear();
		console.log('0. Video');
		console.log('1. Other');
		console.log('2. Music');
		console.log('3. All');
		var type = readline.question('Type of file? ');
		if(type=='0'){
			searchType = video;
		}else if(type=='1'){
			searchType = other;
		}else if(type=='2'){
			searchType = music;
		}else if(type=='3'){
			searchType = all;
		};
		if(!isNaN(parseInt(type))&&searchType!=''){
			isType = true;
		}
	};

	var search = readline.question('TPB Search Query: ');
	var searchArr = search.split(" ");
	var search = "";
	for ( var i in searchArr ) {
		search+=(searchArr[i]+'%20');
	};
	search = search.substring(0,search.length-3);
	var results = {};
	const url = "https://thepiratebay.org/search/"+search+searchType;
	curl.get(url,null,(err,resp,body)=>{
		if(resp.statusCode==200){
			var $ = initjQuery(body);
			runAfterCurl($);
		} else {
			console.log('error while fetching url');
		}
	});


	function runAfterCurl($){
		parseSearchPage($);
		downloadResult();
	}
	function initjQuery(html){
		const {JSDOM} = jsdom;
		const dom = new JSDOM(html);
		var $ = (require('jquery'))(dom.window);
		return $;
	};
	function parseSearchPage($){
		var rows = $('#searchResult>tbody>tr');
		console.clear();
		$(rows).each(function(i,row){
			if ( i > 9 ) {
				return false;
			};
			var cell = $($(row).children().filter('td')[1]);
			var div = $(cell).children().filter('div')[0];
			var link = $(div).children().filter('a')[0];
			var text = $(link).prop('title');
			var seed = $($(row).children().filter('td')[2]).text();
			var leech = $($(row).children().filter('td')[3]).text();
			var magnet = $($(cell).children().filter('a')[0]).prop('href');
			var remove = "Details for ";
			text = text.substring(remove.length, text.length);
			var pageLink = $(link).prop('href');
			results[i] = {
				'title':text,
				'magnet':magnet,
				'seeders':seed,
				'leechers':leech,
				'link':pageLink
			};
		});
	};
	function downloadResult(){
		var isChoice = false;
		var choice;
		while(isChoice == false){
			console.clear();
			for(var i=0;i<Object.keys(results).length;i++){
				var title = results[Object.keys(results)[i]].title;
				var seeders = results[Object.keys(results)[i]].seeders;
				var leechers = results[Object.keys(results)[i]].leechers;
				console.log(i+': '+title);
				console.log("    Seeders: "+seeders+' | Leechers: '+leechers);
			};
			console.log("");
			choice = readline.question('Number: ');
			if(!isNaN(parseInt(choice))){
				isChoice = true;
			};
		};
		var client = new torr();
		client.add(results[choice].magnet,{
			path: path
		},function(torrent){
			console.clear();
			setInterval(onProgress,500);
			function onProgress(){
				console.clear();
				console.log('|--------------------------|');
				console.log('| Peers   : '+prettyPad(""+torrent.numPeers)+' |');
				console.log('| Down    : '+prettyPad(prettyBytes(torrent.downloadSpeed))+' |');
				console.log('| Up      : '+prettyPad(prettyBytes(torrent.uploadSpeed))+' |');
				console.log('| Down\'d  : '+prettyPad(prettyBytes(torrent.downloaded))+' |');
				console.log('| Total   : '+prettyPad(prettyBytes(torrent.length))+' |');
				console.log('| Progress: '+prettyPad(""+(Math.round((client.progress*100)*100)/100)+'%')+' |');
				console.log('| Time Rem: '+prettyPad(""+prettyTime(torrent.timeRemaining))+' |');
				console.log('|--------------------------|');
				var total = torrent.files.length;
				var counter = 0;
				for(var j = 0;j<5;j++){
					var file = torrent.files[counter];
					console.log(counter+": "+file.name);
					if(counter+1==total){
						counter = 0;
					}else{
						counter++;
					}
				};
				for(var i in info){
					console.log(info[i]);
				};
			}
			torrent.on('done',function(){
				console.log('finished');
				process.exit();
			});
			torrent.on('warning',function(err){
				updateInfo("Warning : "+err);
			});
			torrent.on('error',function(err){
				updateInfo("Err     : "+err);
			});
			torrent.on('wire',function(wire){
				updateInfo("Wire    : "+wire);
			});
			torrent.on('noPeers',function(announceType){
				updateInfo("No peers: "+announceType);
			});
			function updateInfo(str){
				info[infoNum] = str;
				if(infoNum<4){
					infoNum++;
				}else{
					infoNum = 0
				}
			}
		});
	}
	function roundToHun(num){
		return ""+Math.round(parseInt(num)*100)/100;
	}
	function prettyBytes(num) {
		var exponent, unit, neg = num < 0, units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		if (neg) num = -num
		if (num < 1) return (neg ? '-' : '') + num + ' B'
		exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
		num = Number((num / Math.pow(1000, exponent)).toFixed(2))
		unit = units[exponent]
		return (neg ? '-' : '') + num + ' ' + unit
	};
	function prettyPad(str){
		var pad = '              ';
		return pad.substring(0,pad.length-str.length)+str;
	}
	function prettyTime(milliS){
		var secInit = Math.round(parseInt(milliS)/1000);
		var hourInit = secInit/60/60;
		var hour = Math.floor(hourInit);
		var minInit = (hourInit-hour)*60;
		var min = Math.floor(minInit);
		var secI = (minInit-min)*60;
		var sec = Math.floor(secI);
		var time = beautify(hour, min, sec);
		return time;

		function beautify(hour, min, sec){
			var arr = [hour, min, sec];
			var timeP;
			var outStr = '';
			for(var i in arr){
				if(i==0){timeP='h'}
				else if(i==1){timeP='m'}
				else if(i==2){timeP='s'}
				if((""+arr[i]).length==1){
					outStr += "0"+arr[i]+timeP;
				} else {
					outStr += arr[i]+timeP;
				}
			}
			return outStr;
		}
	}
}
