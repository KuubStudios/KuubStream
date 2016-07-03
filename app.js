var util = require("util");
var fs = require("fs");
var express = require("express");
var bodyParser = require("body-parser");
var http = require("http");
var WebSocketServer = require("websocket").server;
var dns = require("dns");

var config = require("./config.json");
var chat = require("./chat");
var servers = require("./servers");
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

app.get("/:channel", function(req, res) {
	res.render("index", {
		name: req.params.channel
	});
});

app.get("/:channel/chat", function(req, res) {
	res.render("popout", {
		name: req.params.channel,
		user: req.query.user
	});
});

app.get("/api/servers", function(req, res) {
	res.send(JSON.stringify(servers.getLiveServers()));
});

app.get("/api/streams", function(req, res) {
	var live = [];
	for(var name in stream.getLiveStreams()) {
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

app.get("/api/:channel/hitbox", function(req, res) {

});

app.post("/callback/publish", function(req, res) {
	var host = servers.ipToHost(req.headers["x-forwarded-for"]);
	if(host === false) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		res.sendStatus(403);
		return;
	}

	if(req.body.type != "live") {
		res.sendStatus(200);
		return;
	}

	if(stream.startStream(req.body.name, host, req.headers["x-forwarded-for"])) {
		console.log("channel %s going live on %s from %s", req.body.name, host, req.body.addr);
		res.sendStatus(200);
	} else {
		console.log("channel %s is already live on %s new attempt from %s", req.body.name, stream.streams[req.body.name].host, req.body.addr);
		res.sendStatus(401);
	}
});

app.post("/callback/publish_done", function(req, res) {
	var host = servers.ipToHost(req.headers["x-forwarded-for"]);
	if(host === false) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		res.sendStatus(403);
		return;
	}

	if(stream.endStream(req.body.name, host)) {
		console.log("channel %s stopped broadcasting to %s", req.body.name, host);
	}

	res.sendStatus(200);
});

app.post("/callback/play", function(req, res) {
	var host = servers.ipToHost(req.headers["x-forwarded-for"]);
	if(host === false) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		res.sendStatus(403);
		return;
	}

	var target = stream.startPlayback(req.body.name);
	if(target === false) {
		res.sendStatus(404);
		return;
	}

	if(target.type === "ip") {
		if(req.headers["x-forwarded-for"] == target.host) {
			res.sendStatus(200);
		} else {
			res.redirect(302, "rtmp://" + target.host + "/stream/" + req.body.name);
		}
	} else if(target.type == "static") {
		res.redirect(302, target.host);
	}
});

app.post("/callback/play_done", function(req, res) {
	var host = servers.ipToHost(req.headers["x-forwarded-for"]);
	if(host === false) {
		console.warn("unauthorized callback from " + req.headers["x-forwarded-for"]);
		res.sendStatus(403);
		return;
	}

	stream.endPlayback(req.body.name);
	res.sendStatus(200);
});

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