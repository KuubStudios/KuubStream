function Room(chat) {
	this.chat = chat;
	this.clients = [];
	this.lastMsg = 0;
}

Room.prototype.addClient = function(index) {
	this.clients.push(index);
};

Room.prototype.removeClient = function(index) {
	var i = this.clients.indexOf(index);
	if(i > -1 && i < this.clients.length) {
		this.clients[i] = undefined;
	}
}

Room.prototype.usernameTaken = function(name) {
	for(var i=0; i < this.clients.length; i++) {
		var client = this.chat.clients[this.clients[i]];
		if(client != undefined && client.name != undefined && client.name.toLowerCase() == name.toLowerCase()) {
			return true;
		}
	}

	return false;
}

Room.prototype.getUsers = function() {
	var result = [];
	for(var i=0; i < this.clients.length; i++) {
		var client = this.chat.clients[this.clients[i]];
		if(client != undefined && client.name != undefined) {
			result.push(client.name);
		}
	}
	return result;
}

Room.prototype.broadcast = function(msg) {
	if(typeof msg !== "string") {
		msg = JSON.stringify(msg);
	}

	for(var i=0; i < this.clients.length; i++) {
		var index = this.clients[i];
		if(index != undefined && this.chat.clients[index].connection != undefined) {
			this.chat.clients[index].connection.sendUTF(msg);
		}
	}
};

Room.prototype.sendMessage = function(from, content, admin) {
	var time = Math.floor(new Date() / 1000);
	if(typeof from === "object") {
		this.broadcast({ type: "message", id: this.lastMsg++, admin: !!admin, from: from.name, color: from.color, content: content, time: time });
	} else {
		this.broadcast({ type: "message", id: this.lastMsg++, admin: !!admin, from: from, content: content, time: time });
	}
};

module.exports = Room;