angular.module('messenger',[]).factory('messenger', function(){
	messenger	= {};
	listeners	= {};
	messenger.shout	= function(message){
		console.log(message);
		if ( listeners[message] == undefined )
			return;

		for ( var i in listeners[message] ) {
			args	= Array.prototype.slice.call(arguments,1)
			listeners[message][i].apply(this,args);
		}
	}
	messenger.listen= function(message,fn){
		if ( listeners[message] == undefined )
			listeners[message] = [];
		listeners[message].push(fn);
	}
	messenger.listeners	= listeners;
	return messenger;
});