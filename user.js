function User(websocket) {
	var socket = websocket;
	nickname = null;
	gender = null;

	User.prototype.login = (function(data) {
		this.nickname = data.name;
		this.gender = parseInt(data.gender);
	}).bind(this);

	this.sendMessage = (function(msg){
		socket.send(JSON.stringify(msg));
	}).bind(this);

	User.prototype.getName = (function(){
		return this.nickname;
	}).bind(this);

}
module.exports.User = User;