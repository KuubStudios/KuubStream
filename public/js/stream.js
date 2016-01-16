$(function() {
	$(".tse-scrollable").TrackpadScrollEmulator();

	var channel = $("#container").data("channel");

	var player;
	if(window.location.hash == "#dash") {
		var video = $("<video>").attr("id", "video-player").attr("controls", true).attr("autoplay", true).attr("preload", "none");
		$("#player").text("").append(video);

		var context = new Dash.di.DashContext();
		player = new MediaPlayer(context); 
		player.startup();
		player.attachView(video[0]);
		player.attachSource("https://stream.kuubstudios.com/dash/" + channel + ".mpd");
	} else {
		jwplayer.key = "tLc/F7baAVot/r1LiOBmCg8muQ+qhMxWmmfZmg==";

		player = jwplayer("player");
		player.setup({
			aboutlink: "https://kuubstudios.com/",
			abouttext:"Kuub Studios Cinema",
			skin: "glow",
			image: "offline.png",
			file: "rtmp://vps.kuubstudios.com/stream/" + channel,
			autostart: "true",
			stretching: "uniform",
			width: "100%",
			height: "100%"
		});
	}

	var username, usercolor;
	function joinChat() {
		username = $("#chat-username").val().trim();

		if(username == "") {
			$("#login-error").text("Blank usernames are not valid");
			return;
		}

		if(!username.match(/^[A-Za-z0-9_\-]+$/)) {
			$("#login-error").text("Username must be alphanumeric");
			return;
		}

		if(username.length < 2) {
			$("#login-error").text("Username must be more than 1 character");
			return;
		}

		if(username.length > 20) {
			$("#login-error").text("Username must be less than 21 characters");
			return;
		}

		Cookies.set("username", username);
		$("#login-error").text("");
		ws.send(JSON.stringify({
			type: "register",
			name: username
		}));

		if(Cookies.get("color") != undefined) {
			usercolor = Cookies.get("color");
			ws.send(JSON.stringify({
				type: "color",
				color: Cookies.get("color")
			}));
		} else if(usercolor != undefined) {
			ws.send(JSON.stringify({
				type: "color",
				color: usercolor
			}));
		}
	}

	$("#chat-join").click(function() {
		joinChat();
	});

	$("#chat-username").keydown(function(e) {
		if(e.which == 13) {
			joinChat();
			return true;
		}
	});

	function sendChat() {
		var chat = $("#chat-textarea").val().trim();

		if(chat.length > 0) {
			ws.send(JSON.stringify({
				type: "message",
				content: chat
			}));
		}

		$("#chat-textarea").val("");
	}

	$("#chat-button").click(function() {
		sendChat();
	});

	$("#chat-textarea").keydown(function(e) {
		if(e.which == 13) {
			sendChat();
			return false;
		}
	});

	$("#settings-button").click(function() {
		if($("#chat-settings").hasClass("visible")) {
			$("#chat-settings").removeClass("visible");
		} else {
			$("#chat-settings").addClass("visible");
		}
	});

	$("#userlist-button").click(function() {
		if($("#chat-userlist").hasClass("visible")) {
			$("#chat-userlist").removeClass("visible");
		} else {
			$("#chat-userlist").addClass("visible");
		}
	});

	$("#chk-theme").change(function() {
		Cookies.set("theme", this.checked);
		if(this.checked) {
			$("#container").removeClass("theme-light").addClass("theme-light");
		} else {
			$("#container").removeClass("theme-light");
		}
	});

	$("#chk-timestamps").change(function() {
		Cookies.set("timestamps", this.checked);
		if(this.checked) {
			$("#chat-messages").removeClass("theme-light").addClass("show-timestamps");
		} else {
			$("#chat-messages").removeClass("show-timestamps");
		}
	});

	$("#chk-theme").prop("checked", Cookies.get("theme") == "true").change();
	$("#chk-timestamps").prop("checked", Cookies.get("timestamps") == "true").change();

	$("#btn-clearchat").click(function() {
		$("#chat-lines").empty();
	});

	function rgb2hex(orig){
		var rgb = orig.replace(/\s/g,'').match(/^rgba?\((\d+),(\d+),(\d+)/i);
		return (rgb && rgb.length === 4) ? "#" +
		("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
		("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : orig;
	}

	$("#chat-colors a").click(function() {
		usercolor = rgb2hex($(this).css("background-color")).toUpperCase();
		Cookies.set("color", usercolor);

		ws.send(JSON.stringify({
			type: "color",
			color: usercolor
		}));
	});

	function showLoginDialog() {
		$("#chat-username").val(Cookies.get("username"));
		$("#chat-content").removeClass("disabled").addClass("disabled");
		$("#chat-textarea").attr("disabled", true);
		$("#chat-button").attr("disabled", true);
		$("#chat-login").css("display", "initial");
	}

	function hideLoginDialog() {
		$("#chat-content").removeClass("disabled");
		$("#chat-textarea").attr("disabled", false);
		$("#chat-button").attr("disabled", false);
		$("#chat-login").css("display", "none");
	}

	function checkMention(text) {
		var split = text.split(/\b/);
		var len = split.length;
		var buffer = "";

		for(var i=0; i < len; i++) {
			var word = split[i];
			if(word.toLowerCase() == username.toLowerCase()) {
				buffer += '<span class="mention">' + word + '</span>';
			} else {
				buffer += word;
			}
		}

		return buffer;
	}

	function formatTime(unix) {
		if(unix == undefined) {
			return;
		}

		var date = new Date(unix * 1000);

		var hours = date.getHours();
		var minutes = date.getMinutes();

		if(hours < 10) hours = "0" + hours;
		if(minutes < 10) minutes = "0" + minutes;

		return "" + hours + ":" + minutes;
	}

	function appendMessage(json) {
		var li = $("<li>").addClass("chat-line");

		if(json.admin) {
			li.addClass("admin");
		}

		var text = json.content;
		if(json.from != "server" && json.from.toLowerCase() != username.toLowerCase()) {
			text = checkMention(text);
		}

		li.append($("<span>").addClass("timestamp").text(formatTime(json.time)));
		li.append($("<span>").addClass("from").css("color", json.color).text(json.from));
		li.append('<span class="colon">:</span>');
		li.append($("<span>").addClass("message").html(text));

		$("#chat-lines").append(li);
		if($("#chat-lines li").size() > 500) {
			$("#chat-lines li:first-child").remove();
		}

		$("#chat-messages .tse-scroll-content").scrollTop($("#chat-messages .tse-scroll-content")[0].scrollHeight);
	}

	var ws;
	function start() {
		ws = new WebSocket("wss://stream.kuubstudios.com/ws?room=" + channel);
		ws.onopen = function() {
			console.log("websocket opened");
			if(username === undefined) {
				showLoginDialog();
			} else {
				ws.send(JSON.stringify({
					type: "register",
					name: username
				}));

				ws.send(JSON.stringify({
					type: "color",
					color: usercolor
				}));
			}
		};

		ws.onerror = function(err) {
			console.error(err);
		};

		ws.onmessage = function(msg) {
			//console.log(msg);

			var json = JSON.parse(msg.data);
			if(json.type == "register") {
				if(json.success) {
					hideLoginDialog();
				} else {
					$("#login-error").text(json.reason);
				}
			} else if(json.type == "message") {
				appendMessage(json);
			} else if(json.type == "color") {
				usercolor = json.color;

				$("#chat-colors a").removeClass("selected");
				$("#chat-colors a").each(function(i) {
					if(rgb2hex($(this).css("background-color")).toUpperCase() == json.color) {
						$(this).addClass("selected");
						return false;
					}
				});
			}
		};

		ws.onclose = function() {
			console.warn("lost connection");
			$("#chat-lines").append('<li class="chat-line admin"><span class="message">Lost connection, attempting to reconnect..</span></li>');
		}

		function check() {
			if(!ws || ws.readyState == 3) {
				start();
			}
		}
		setInterval(check, 4000);
	}
	start();
});