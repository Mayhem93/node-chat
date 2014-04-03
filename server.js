var WebServerSocket = require("ws").Server;
var User = require("./user").User;
var wss = new WebServerSocket({port: 8001});
var fs = require('fs');

const MSG_LOG_IN = 0;
const MSG_TEXT = 1;

const MSG_HELLO = 3;
const MSG_DENIED = 4;

const MSG_FAILED = 6;
const MSG_USERLIST = 7;
const MSG_SYS = 8;
const MSG_MOTD = 9;
const MSG_PRIVATE = 10;
const MSG_USER_LEFT = 11;
const MSG_USER_ENTER = 12;

const DENY_REASON_IN_USE = 0;	//nickname is already in use

var loggedIn = [];

function getUsersList() {
	users = [];

	for(var i in wss.clients) {
		key = wss.clients[i].upgradeReq.headers['sec-websocket-key'];
		if (loggedIn[key] !== undefined)
			users.push({"nickname": loggedIn[key].nickname, "gender": loggedIn[key].gender});
	}

	users.sort(function(a, b){
		return a.nickname.localeCompare(b.nickname, "ro", {"numeric": true})
	});

	return users;
}

function getMOTD() {
	return fs.readFileSync('./MOTD', {encoding: 'utf-8'});
}

wss.broadcast = function(message, except) {
	for(var i in this.clients) {
		key = wss.clients[i].upgradeReq.headers['sec-websocket-key'];

		if (key === except)
			continue;

		this.clients[i].send(JSON.stringify(message));
	}
};

wss.on("error", function(error){
	console.log(error);
});

wss.on("connection", function(ws){
	var connKey = ws.upgradeReq.headers['sec-websocket-key'];

	ws.on("message", function(message){
		message = JSON.parse(message);

		switch(message.type) {
			case MSG_LOG_IN: {

				found = false;

				for(var i in loggedIn) {
					if (loggedIn.hasOwnProperty(i) && loggedIn[i].nickname == message.content.name) {
						ws.send(JSON.stringify({type: MSG_DENIED, reason: DENY_REASON_IN_USE}));
						found = true;
					}
				}

				if(found) break;

				loggedIn[connKey] = new User(ws);
				loggedIn[connKey].login(message.content);

				loggedIn[connKey].sendMessage({type: MSG_HELLO, content: "Welcome "+message.content.name+" !", ts: new Date().getTime()});
				loggedIn[connKey].sendMessage({type: MSG_MOTD, content: getMOTD(), ts: new Date().getTime()});
				wss.broadcast({type: MSG_USERLIST, content: getUsersList()});
				wss.broadcast({type: MSG_USER_ENTER, content: message.content.name, ts: new Date().getTime()}, connKey);
				break;
			}

			case MSG_TEXT: {
				wss.broadcast({type: MSG_TEXT, content: message.content, ts: new Date().getTime(), from: message.from});

				break;
			}

			case MSG_USERLIST: {
				loggedIn[connKey].sendMessage({type: MSG_USERLIST, content: getUsersList()});

				break;
			}

			case MSG_PRIVATE: {
				for(var i in loggedIn) {
					if (loggedIn.hasOwnProperty(i) && loggedIn[i].nickname == message.to) {
						recipientKey = i;
					}
				}

				try {
					loggedIn[recipientKey].sendMessage({type: MSG_PRIVATE, content: message.content, from: message.from, to: message.to, ts: new Date().getTime()});
					loggedIn[connKey].sendMessage({type: MSG_PRIVATE, content: message.content, from: message.from, to: message.to, ts: new Date().getTime()});
				} catch (e) {
					console.log("Couldn't send message: "+JSON.stringify({type: MSG_PRIVATE, content: message.content, from: message.from, to: message.to, ts: new Date().getTime()}));
				}
				break;
			}
		}
		console.log(message);

	});

	ws.on("close", function() {
		wss.broadcast({type: MSG_USERLIST, content: getUsersList()});

		if (loggedIn[connKey])
			wss.broadcast({type: MSG_USER_LEFT, content: loggedIn[connKey].nickname, ts: new Date().getTime()});

		delete loggedIn[connKey];
	});

	ws.on("error", function(error){
		console.log(error);
	});
});
