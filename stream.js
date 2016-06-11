module.exports = {
	streams: {},

	startStream: function(name, host, ip) {
		if(this.streams[name] === undefined) {
			this.streams[name] = {
				host: host,
				ip: ip
			};

			return true;
		} else {
			return false;
		}
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
		if(this.streams[name] != undefined) {
			return this.streams[name].ip;
		}

		return false;
	},

	endPlayback: function(name) {

	},

	getLiveStreams: function() {
		return this.streams;
	}
}