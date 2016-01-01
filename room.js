function Room(chat) {
	this.chat = chat;
	this.clients = [];
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
		if(this.chat.clients[this.clients[i]] != undefined && this.chat.clients[this.clients[i]].name == name) {
			return true;
		}
	}

	return false;
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
	if(typeof from === "object") {
		this.broadcast({ type: "message", admin: !!admin, from: from.name, color: from.color, content: content });
	} else {
		this.broadcast({ type: "message", admin: !!admin, from: from, content: content });
	}
};

module.exports = Room;