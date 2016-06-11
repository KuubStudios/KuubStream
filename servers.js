var http = require("http");
var dns = require("dns");
var config = require("./config.json");

module.exports = {
	liveServers: {},

	_init: function() {
		for(var name in config.servers) {
			this.liveServers[name] = {
				up: false,
				host: config.servers[name]
			};
			this._resolveHost(name, config.servers[name]);
		}

		var _this = this;
		setInterval(function() {
			_this._pollServers(_this);
		}, 1000 * 60);
		this._pollServers(this);
	},

	_resolveHost: function(name, host) {
		var _this = this;
		dns.resolve4(host, function(err, addresses) {
			_this.liveServers[name].ip = addresses[0];
		});
	},

	_pollServers: function(scope) {
		for(var name in config.servers) {
			scope._pollServer(scope, name, config.servers[name]);
		}
	},

	_pollServer: function(scope, name, host) {
		http.get("http://" + host, function(res) {
			if(res.statusCode == 200) {
				scope.liveServers[name].up = true;
			} else {
				scope.liveServers[name].up = false;
			}
		}).on("error", function(e) {
			scope.liveServers[name].up = false;
		});
	},

	ipToHost: function(ip) {
		for(var name in this.liveServers) {
			if(this.liveServers[name].ip == ip) {
				return this.liveServers[name].host;
			}
		}

		return false;
	},

	getLiveServers: function() {
		var result = {};
		for(var name in this.liveServers) {
			if(this.liveServers[name].up) {
				result[name] = this.liveServers[name].host;
			}
		}
		return result;
	}
}

module.exports._init();