function User(websocket) {
	var socket = websocket;
	nickname = null;

	User.prototype.login = (function(name) {
		this.nickname = name;
	}).bind(this);

	this.sendMessage = (function(msg){
		socket.send(JSON.stringify(msg));
	}).bind(this);

	User.prototype.getName = (function(){
		return this.nickname;
	}).bind(this);

}
module.exports.User = User;