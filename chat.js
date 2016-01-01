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
		var name = this.clients[index].name;
		if(name !== undefined) {
			this.rooms[this.clients[index].room].broadcast({ type: "message", admin: true, from: "server", content: name + " has disconnected" });
			console.log(util.format("%s (%s) disconnected from %s", name, this.clients[index].connection.remoteAddress, this.clients[index].room));
		} else {
			console.log(util.format("%s disconnected from %s", this.clients[index].connection.remoteAddress, this.clients[index].room));
		}

		this.rooms[this.clients[index].room].removeClient(index);
		this.clients[index] = undefined;
	},

	registerUser: function(index, json) {
		if(this.clients[index].registered) {
			this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "already registered" }));
			return;
		}

		if(json.name == undefined || json.name.length < 2 || json.name.length > 20 || !json.name.match(/^[A-Za-z0-9_\-]+$/)) {
			this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "invalid name" }));
			return;
		}

		if(this.rooms[this.clients[index].room].usernameTaken(json.name)) {
			this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "username taken" }));
			return;
		}

		console.log(util.format("%s registered as %s to %s", this.clients[index].connection.remoteAddress, json.name, this.clients[index].room));

		this.clients[index].name = json.name;
		this.clients[index].color = this.colors[Math.floor(Math.random() * this.colors.length)];
		this.clients[index].registered = true;

		this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: true }));
		this.rooms[this.clients[index].room].sendMessage("server", json.name + " has connected", true);
	},

	messageReceived: function(index, json) {
		if(!this.clients[index].registered) {
			return;
		}

		var text = json.content.trim();
		if(text.length == 0 || text.length > 5000) {
			return;
		}

		console.log(util.format("%s > %s: %s", this.clients[index].name, this.clients[index].room, text));

		text = linkify(text, { target: "_blank" });
		text = kappa.kappafy(text);

		this.rooms[this.clients[index].room].sendMessage(this.clients[index], text);
	}

	/*
	clients: [],
	usernames: [],

	clientConnected: function(connection) {
		return this.clients.push({ connection: connection, registered: false }) - 1;
	},

	clientDisconnected: function(index) {
		var name = this.clients[index].name;
		if(name !== undefined) {
			this.broadcast({ type: "message", admin: true, from: "server", content: name + " has disconnected" });
		}

		this.usernames[index] = undefined;
		this.clients[index] = undefined;
	},

	registerUser: function(index, json) {
		if(this.clients[index].registered) {
			this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "already registered" }));
			return;
		}

		if(json.name == undefined || json.name.length < 2 || json.name.length > 20 || !json.name.match(/^[A-Za-z0-9_\-]+$/)) {
			this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "invalid name" }));
			return;
		}

		if(this.usernames.indexOf(json.name) > -1) {
			this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: false, reason: "username taken" }));
			return;
		}

		this.usernames[index] = json.name;
		this.clients[index].name = json.name;
		this.clients[index].color = this.colors[Math.floor(Math.random() * this.colors.length)];
		this.clients[index].registered = true;

		this.clients[index].connection.sendUTF(JSON.stringify({ type: "register", success: true }));
		this.sendMessage("server", json.name + " has connected", true);
	},

	sendMessage: function(from, content, admin) {
		if(typeof from === "object") {
			this.broadcast({ type: "message", admin: !!admin, from: from.name, color: from.color, content: content });
		} else {
			this.broadcast({ type: "message", admin: !!admin, from: from, content: content });
		}
	},

	broadcast: function(msg) {
		if(typeof msg !== "string") {
			msg = JSON.stringify(msg);
		}

		for(var i=0; i < this.clients.length; i++) {
			if(this.clients[i] != undefined && this.clients[i].connection != undefined) {
				this.clients[i].connection.sendUTF(msg);
			}
		}
	}
	*/
}