var util = require("util");
var Room = require("./room");

var linkify = require("linkifyjs/string");
var kappa = require("./kappa");

module.exports = {
	colors: [ "#FF0000", "#0000FF", "#008000", "#B22222", "#FF7F50", "#9ACD32", "#FF4500", "#2E8B57", "#DAA520", "#D2691E", "#5F9EA0", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F"],
	clients: [],
	rooms: {},

	clientConnected: function(connection, room) {
		console.log(connection.remoteAddress + " connected to room " + room);

		if(this.rooms[room] == undefined) {
			this.rooms[room] = new Room(this);
		}

		var index = this.clients.push({ connection: connection, room: room, registered: false }) - 1;
		this.rooms[room].addClient(index);

		return index;
	},

	clientDisconnected: function(index) {
		var client = this.clients[index];
		if(client.name !== undefined) {
			this.rooms[client.room].sendMessage("server", client.name + " has disconnected", true);
			console.log(util.format("%s (%s) disconnected from %s", client.name, client.connection.remoteAddress, client.room));
		} else {
			console.log(util.format("%s disconnected from %s", client.connection.remoteAddress, client.room));
		}

		this.rooms[client.room].removeClient(index);
		this.clients[index] = undefined;
	},

	getRoom: function(room) {
		return this.rooms[room];
	},

	setColor: function(index, color) {
		color = "" + color;

		if(color != "undefined" && this.colors.indexOf(color.toUpperCase()) > -1) {
			color = color.toUpperCase();
		} else {
			color = this.colors[Math.floor(Math.random() * this.colors.length)];
		}

		this.clients[index].color = color;
		this.clients[index].connection.sendUTF(JSON.stringify({ type: "color", color: color }));
	},

	registerUser: function(index, json) {
		var client = this.clients[index];

		if(client.registered) {
			client.connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "already registered" }));
			return;
		}

		if(json.name == undefined || json.name.length < 2 || json.name.length > 20 || !json.name.match(/^[A-Za-z0-9_\-]+$/)) {
			client.connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "invalid name" }));
			return;
		}

		if(this.rooms[client.room].usernameTaken(json.name)) {
			client.connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "username taken" }));
			return;
		}

		console.log(util.format("%s registered as %s to %s", client.connection.remoteAddress, json.name, client.room));

		this.clients[index].name = json.name;
		this.setColor(index);
		this.clients[index].registered = true;

		client.connection.sendUTF(JSON.stringify({ type: "register", success: true }));
		this.rooms[client.room].sendMessage("server", json.name + " has connected", true);
	},

	messageReceived: function(index, json) {
		var client = this.clients[index];

		if(!client.registered) {
			return;
		}

		var text = json.content.trim();
		if(text.length == 0 || text.length > 5000) {
			return;
		}

		console.log(util.format("%s > %s: %s", client.name, client.room, text));

		text = linkify(text, { target: "_blank" });
		text = kappa.kappafy(text);

		if(text.substring(0, 4) == '&gt;') {
			text = '<span style="color:#789922 !important">' + text + '</span>';
		}

		this.rooms[client.room].sendMessage(client, text);
	}
}