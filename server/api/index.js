module.extend         = require('./../include/extend.js').extend;
module.commands = {}; // API command library
module.isInitialized	= false;
module.init	= function() {
	if ( module.isInitialized && module.parent.exports.get('env') !== "development" )
		return;
	var fs  = require("fs");
	var walk           = require('./../include/walk.js').walk;
	// WARNING: this may break on *nix systems due to reliance of forward slash in string
	walk(__dirname+"/commands", function(err,files) {
		if ( files == undefined )
			return;
		files.forEach(function(file){
			if ( file.substr(-2) != "js" )
				return;
			obj = require(file);
			while ( file.indexOf('/') != -1 )
				file  = file.substr(file.indexOf('/')+1);
			if ( typeof obj == "object" )
				module.commands[file.substr(0,file.length-3)]  = obj.cmd;
		});
	});
	module.isInitialized	= true;
}
module.init();

api	= function(req,res) {
	/**
	 * API dependencies
	 */

	module.elasticQuery   = require('./../include/elasticQuery.js').elasticQuery;

	/**
	 * API object data
	 */

	response = []; // response sent back over HTTP

	waiting			= false;
	numWaiting		= 0;
	waitingObj		= {};
	numWaitingObj	= {};
	callback		= function(){};
	callbacks		= {};

	/**
	 * API configuration
	 */
	 if ( module.parent.exports.get('env') === "development" ) {
	 	module.init();
	 }

	/**
	 * API library functions
	 */

	// this function is used in conjunction with an async call
	module.register			= function(fn,type) {
		if ( type == undefined ) {
			callback	= fn;
		}
		else {
			callbacks[type]	= fn;
		}
	}

	// this function calls within an API command to indicate an async process
	// is about to occur
	module.wait				= function(type) {
		if ( type == undefined ) {
			waiting		= true;
			numWaiting++;
		}
		else {
			waitingObj[type]	= true;
			if ( numWaitingObj[type] == undefined )
				numWaitingObj[type]	= 0;
			numWaitingObj[type]++;
		}
	}

	// this function occurs when an async call like an ES query is completed
	module.complete			= function(type) {
		if ( type == undefined ) {
			numWaiting--;
			if ( numWaiting == 0 )
				waiting		= false;
		}
		else if ( numWaitingObj[type] != undefined ) {
			numWaitingObj[type]--;
			if ( numWaitingObj[type] === 0 ) {
				waitingObj[type]		= false;
				if ( callbacks[type] != undefined )
					callbacks[type]();
			}
		}
	}

	// consider renaming this because it is semantically confusing
	// this function actually stores a message and does not actually send it
	module.sendMessage		= function(message,errors,i) {
		if ( errors == undefined )
			errors	= [];
		if ( i == undefined ) {
			for ( var i = 0; i < response.length && response.message != undefined; i++ );
		}
		if ( response.push != undefined )
			response[i]	= {"message": message, "errors": errors};

		numWaiting--;
		if ( numWaiting == 0 )
			waiting		= false;
	}

	// our unique ID can be important for any elastic queries
	module.generateID      = function(type) {
		return "a"+(new Date).getTime()+"_"+module.generateUniqueID()+"_4294967296_"+type;
	}

	// our unique ID can be important for any elastic queries
	lastId  = 0;
	lastInsertTime  = 0;
	module.generateUniqueID	= function() {
		// WARNING:
		// our unique idea is 5 characters long and assumes
		// that 10,000 elastic queries will never take place
		// within 1 second!
		if ( lastInsertTime != (new Date).getTime() )
			lastId	= 0;
		id	= lastId.toString();
		while ( id.length < "10000".length ) id = "0"+id;
		lastId++;
		lastInsertTime	= (new Date).getTime();
		return id;
	}

	// return HTTP query regardless of the type (POST or GET)
	getHTTPQuery	= function(req) {
		// HACK: this allows us to read HTTP request key/val pairs across GET/POST
		query = require('url').parse(req.url,true).query;
		if ( query.q == undefined )
			query = req.body;
		query = JSON.parse(query.q);

		return query;
	}

	// this should receive a API request to perform a compile step
	compileAPI	= function(req, res) {
		// todo: stub this one out
	}

	// parses an array of API commands
	runCommands  = function(method, q) {
		// commented out 5/22/14: broke the output pipe
		//for ( var i = 0; i < q.length; i++ )
		//	response[i]	= {};
		for ( var i in q )
			if ( !requestSupported(method,q[i]) )
				continue;
			else
				runCommand(module.commands[q[i].cmd],q[i]);
	}

	runCommand	= function(cmd,q) {
		try {
			try {
				var results = cmd.fn(q);
			} catch (e) {
				if ( module.parent.app.get('env') === "development" ) {
					console.log("========================")
					console.log("API ERROR:")
					console.log(e);
					console.log("========================")
				}
			}
			if ( results == undefined )
				results	= {};
			if ( results.message == undefined && results.errors == undefined ) {
				message = results;
				results = {"errors": [], "message": message};
			}
			if ( results.message == undefined )
				results.message = {};
			if ( results.errors == undefined )
				results.errors  = {};
			if ( !waiting && response.push != undefined )
				response.push(results);
		} catch (e) {
			if ( !waiting && response.push != undefined )
				response.push(results);
		}
	}

	// returns a boolean
	requestSupported	= function(method,q) {
		//check isDefined
		if ( module.commands[q.cmd] != undefined ) {
			cmd = module.commands[q.cmd];
			if ( !Array.isArray(cmd.httpMethod) )
				cmd.httpMethod  = [cmd.httpMethod];

			// checkHTTPMethod
			validMethod = false;
			for ( var j in cmd.httpMethod ) {
				if ( method.toLowerCase() == cmd.httpMethod[j].toLowerCase() )
					validMethod = true;
			}

			if ( !validMethod )
				return false;

			return true;
		}
		else
			return false;
	}

	sendResponse	= function(res,q) {
		if ( waiting ) {
			fn	= function() {
				if ( !waiting ) {
					if ( module.parent.app.get('env') === "development" ) {
						console.log("========================")
						console.log("***SUCCESS***:")
						console.log("SENDING API RESPONSE:")
						console.log(response);
						console.log("========================")
					}
					if ( response.length == 1 )
						response	= response[0];
					res.send(200,JSON.stringify(response));
					delete response; // added 5/22/14 it was propagating into other requests..
				}
				else
					setTimeout(fn,1)
			}
			setTimeout(fn,1);
		}
		else {
			if ( q.length == 1 )
				response	= response[0];
			console.log(response);
			//res.json(response); // removed 5/22/14: was not flushing HTTP request
			res.send(200,JSON.stringify(response));
			delete response; // added 5/22/14 it was propagating into other requests..
		}
	}
	
	/**
	 * API call
	 */

	if ( module.parent.exports.get('env') === "compile" ) {
		compileAPI();
		return;
	}
	if ( !module.isInitialized )
		setTimeout(function(){api(req,res)},10);

	// populate query
	query	= getHTTPQuery(req);

	if ( module.parent.auth != undefined ) {
		auth.checkToken(query);
	}
	try {
		if ( query != undefined ) {
			if ( !Array.isArray(query) )
				query = [query];
			runCommands(req.method, query);
			sendResponse(res,query);
		}
	} catch(e) {
		if ( module.parent.app.get('env') === "development" ) {
			console.log("========================")
			console.log("SENDING EMPTY API RESPONSE:")
			console.log(e);
			console.log("========================")
		}
		res.json({"errors":[],"message":{}});
	}
}


exports.api	= api;