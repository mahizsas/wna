angular.module('api',[]).factory('api', function(){
	api	= {};
	api.request	= function(cmd, data, callback) {
		if ( callback == undefined )
			callback	= function(){}
		window.httpGET('/api/', callback, {"cmd": cmd, "data": data, "token": window.token});
	}

	apiQueues	= {};
	api.queue	= function(key) {
		// key optionally attaches the request to the named queue,
		// else generic queue used
	}

	// flush the current api stack
	api.flush	= function(key) {
		// key optionally flushes the named queue,
		// else flushes generic queue

	}
	return api;
});