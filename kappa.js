var https = require("https");
var config = require("./config.json");

module.exports = {
	emotes: {},
	kappafy: function(text) {
		var split = text.split(/\b/);
		var len = split.length;
		var buffer = "";

		for(var i=0; i < len; i++) {
			var word = split[i];
			if(word in this.emotes) {
				buffer += '<span class="tooltip" data-tooltip="' + word + '"><img class="emoticon" src="' + this.emotes[word] + '" alt="' + word + '"></span>';
			} else {
				buffer += word;
			}
		}

		return buffer;
	}
}

https.get("https://twitchemotes.com/api_cache/v2/global.json", function(res) {
	var body = "";

	res.on("data", function(d) {
		body += d;
	});

	res.on("end", function() {
		var json = JSON.parse(body);

		var template = json.template.small;
		for(var emote in json.emotes) {
			module.exports.emotes[emote] = template.replace("{image_id}", json.emotes[emote].image_id);
		}
	});
});

var ignoredChannels = config.kappafy.ignored;

https.get("https://twitchemotes.com/api_cache/v2/subscriber.json", function(res) {
	var body = "";

	res.on("data", function(d) {
		body += d;
	});

	res.on("end", function() {
		var json = JSON.parse(body);

		var template = json.template.small;
		for(var channel in json.channels) {
			if(ignoredChannels.indexOf(channel.toLowerCase()) > -1) {
				continue;
			}

			for(var i=0; i < json.channels[channel].emotes.length; i++) {
				var emote = json.channels[channel].emotes[i].code;
				module.exports.emotes[emote] = template.replace("{image_id}", json.channels[channel].emotes[i].image_id);
			}
		}
	});
});