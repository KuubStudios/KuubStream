var util = require("util");
var fs = require("fs");
var express = require("express");
var http = require("http");
var WebSocketServer = require("websocket").server;

var config = require("./config.json");
var chat = require("./chat");

var app = express();
app.set("view engine", "ejs");

var server = http.createServer(app);
var websocket = new WebSocketServer({
	httpServer: server,
	autoAcceptConnections: false
});

app.get("/:channel", function(req, res) {
	res.render("index", { name: req.params.channel });
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