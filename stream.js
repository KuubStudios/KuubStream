var config = require("./config.json");

module.exports = {
	streams: {},

	startStream: function(name, host, ip) {
		if(config.static[name] !== undefined) {
			return false;
		}

		if(this.streams[name] === undefined) {
			this.streams[name] = {
				host: host,
				ip: ip
			};

			return true;
		}

		return false;
	},

	endStream: function(name, host) {
		if(this.streams[name] && this.streams[name].host == host) {
			this.streams[name] = undefined;
			return true;
		}
		return false;
	},

	getStream: function(name) {
		return this.streams[name];
	},

	startPlayback: function(name) {
		if(config.static[name] !== undefined) {
			return {
				type: "static",
				host: config.static[name]
			};
		}

		if(this.streams[name] != undefined) {
			return {
				type: "ip",
				host: this.streams[name].ip
			};
		}

		return false;
	},

	endPlayback: function(name) {

	},

	getLiveStreams: function() {
		return this.streams;
	}
}