$(function() {
	$(".tse-scrollable").TrackpadScrollEmulator();

	var channel = $("#container").data("channel");

	jwplayer.key = "tLc/F7baAVot/r1LiOBmCg8muQ+qhMxWmmfZmg==";
	var player = jwplayer("player");
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

	var username;
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

		$("#login-error").text("");
		ws.send(JSON.stringify({
			type: "register",
			name: username
		}));
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

	function showLoginDialog() {
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

	function appendMessage(json) {
		var li = $("<li>").addClass("chat-line");

		if(json.admin) {
			li.addClass("admin");
		}

		li.append($("<span>").addClass("timestamp").text(json.time));
		li.append($("<span>").addClass("from").css("color", json.color).text(json.from));
		li.append('<span class="colon">:</span>');
		li.append($("<span>").addClass("message").html(json.content));

		$("#chat-lines").append(li);
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
			}
		};

		ws.onerror = function(err) {
			console.error(err);
		};

		ws.onmessage = function(msg) {
			console.log(msg);

			var json = JSON.parse(msg.data);
			if(json.type == "register") {
				if(json.success) {
					hideLoginDialog();
				} else {
					$("#login-error").text(json.reason);
				}
			} else if(json.type == "message") {
				appendMessage(json);
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