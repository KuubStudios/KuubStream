var util = require("util");
var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var http = require("http");
var WebSocketServer = require("websocket").server;
var dns = require("dns");

var config = require("./config.json");
var chat = require("./chat");
var stream = require("./stream");

var app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = http.createServer(app);
var websocket = new WebSocketServer({
	httpServer: server,
	autoAcceptConnections: false
});

var liveServers = {};
var liveStreams = {};
var validNodes = [];
var nodeMap = {};

function resolveHost(name) {
	var host = config.servers[name];
	dns.resolve4(host, function(err, addresses) {
		validNodes = validNodes.concat(addresses);
		nodeMap[host] = {};
		nodeMap[host].ip = addresses[0];
		nodeMap[host].rooms = {};
	});
}

for(var name in config.servers) {
	resolveHost(name);
}

function ipToHost(ip) {
	for(var name in nodeMap) {
		if(nodeMap[name].ip == ip) {
			return name;
		}
	}
}

app.get("/:channel", function(req, res) {
	res.render("index", {
		name: req.params.channel,
		source: config.rtmp.replace("{room}", req.params.channel)
	});
});

app.get("/:channel/chat", function(req, res) {
	res.render("popout", {
		name: req.params.channel,
		user: req.query.user
	});
});

app.get("/api/servers", function(req, res) {
	res.send(JSON.stringify(liveServers));
});

app.get("/api/streams", function(req, res) {
	var live = [];
	for(var name in liveStreams) {
		live.push(name);
	}

	res.send(JSON.stringify(live));
});

app.get("/api/:channel/viewers", function(req, res) {
	var viewers = [];
	var room  = chat.getRoom(req.params.channel);
	if(room != undefined) {
		viewers = room.getUsers();
	}

	res.send(JSON.stringify({
		viewers: viewers
	}));
});

app.post("/callback/publish", function(req, res) {
	if(validNodes.indexOf(req.headers["x-forwarded-for"]) == -1) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		return;
	}

	if(req.body.type != "live") {
		res.sendStatus(200);
		return;
	}

	//console.log(req.body);

	if(liveStreams[req.body.name] == undefined) {
		var host = ipToHost(req.headers["x-forwarded-for"]);
		console.log("channel %s going live on %s from %s", req.body.name, host, req.body.addr);
		liveStreams[req.body.name] = {
			host: host,
			ip: req.headers["x-forwarded-for"]
		};

		res.sendStatus(200);
	} else {
		console.log("channel %s is already live on %s new attempt from %s", req.body.name, liveStreams[req.body.name].host, req.body.addr);

		res.sendStatus(401);
	}
});

app.post("/callback/publish_done", function(req, res) {
	if(validNodes.indexOf(req.headers["x-forwarded-for"]) == -1) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		return;
	}

	var host = ipToHost(req.headers["x-forwarded-for"]);
	if(liveStreams[req.body.name] && liveStreams[req.body.name].host == host) {
		console.log("channel %s stopped broadcasting to %s", req.body.name, host);
		liveStreams[req.body.name] = undefined;
	}
	res.sendStatus(200);
});

app.post("/callback/play", function(req, res) {
	if(validNodes.indexOf(req.headers["x-forwarded-for"]) == -1) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		return;
	}

	//console.log("play request for %s from %s", req.body.name, req.body.addr);

	if(liveStreams[req.body.name] != undefined) {
		//console.log("live on " + liveStreams[req.body.name].host);
		var ip = liveStreams[req.body.name].ip;

		if(req.headers["x-forwarded-for"] == ip) {
			//console.log("local");
			res.sendStatus(200);
		} else {
			//console.log("remote rtmp://" + ip + "/stream/" + req.body.name);
			res.redirect(302, "rtmp://" + ip + "/stream/" + req.body.name);
		}
	} else {
		//console.log("offline");
		res.sendStatus(404);
	}
});

app.post("/callback/play_done", function(req, res) {
	if(validNodes.indexOf(req.headers["x-forwarded-for"]) == -1) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		return;
	}

	res.sendStatus(200);
});

function pollSingleServer(name, host) {
	//console.log("checking " + name + " " + host);
	http.get("http://"+host, function(res) {
		if(res.statusCode == 200) {
			liveServers[name] = host;
			//console.log(name + " is up " + host);
		} else {
			liveServers[name] = undefined;
			//console.log(name + " is down");
		}
	}).on("error", function(e) {
		liveServers[name] = undefined;
		//console.log(name + " is down");
	});
}

function pollServers() {
	for(var name in config.servers) {
		pollSingleServer(name, config.servers[name]);
	}
}

for(var name in config.servers) {
	liveServers[name] = config.servers[name];
}

setInterval(pollServers, 1000 * 60);
pollServers();

function validateOrigin(origin) {
	return origin == config.origin;
}

websocket.on("request", function(req) {
	var room = req.resourceURL.query.room;

	if(!validateOrigin(req.origin) || room == undefined) {
		req.reject();
		return;
	}

	console.log(util.format("accepted request from %s", req.remoteAddress));

	var connection = req.accept(null, req.origin);
	var index = chat.clientConnected(connection, room);

	connection.on("message", function(msg) {
		if(msg.type !== "utf8") {
			return;
		}

		var json = JSON.parse(msg.utf8Data);
		if(json.type == "register") {
			chat.registerUser(index, json);
		} else if(json.type == "message") {
			chat.messageReceived(index, json);
		} else if(json.type == "color") {
			chat.setColor(index, json.color);
		}
	});

	connection.on("close", function() {
		chat.clientDisconnected(index);
	});
});

try {
	fs.unlinkSync("socket.sock");
} catch(ex) {}

server.listen("socket.sock", function() {
	fs.chmodSync("socket.sock", 0x777);

	console.log("listening");
});