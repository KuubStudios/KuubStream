var connectServer = function() {
	console.warn("connectServer called before it was loaded!");
};

$(function() {
	var channel = $("#container").data("channel");

	var ua = navigator.userAgent.toLowerCase();
	var isAndroid = ua.indexOf("android") > -1;
	if(isAndroid) {
		$("#player").html('Click <a href="' + source + '">here</a> to view this stream');
	} else if(window.location.hash == "#dash") {
		// TODO
	} else if(window.location.hash == "#hitbox") {
		$("#player").text("");
		
		$("<iframe>", {
			src: "https://www.hitbox.tv/embed/" + channel + "?autoplay=true",
			frameborder: 0,
			scrolling: "no"
		}).appendTo("#player");
	} else {
		jwplayer.key = "tLc/F7baAVot/r1LiOBmCg8muQ+qhMxWmmfZmg==";
		var player = jwplayer("player");

		connectServer = function(host) {
			console.log("connecting to " + host);

			player.setup({
				aboutlink: "https://github.com/KuubStudios/KuubStream",
				abouttext:"Kuub Studios Cinema",
				skin: "glow",
				image: "offline.png",
				file: "rtmp://" + host + "/stream/" + channel,
				autostart: "true",
				stretching: "uniform",
				width: "100%",
				height: "100%"
			});
		}
	}
});