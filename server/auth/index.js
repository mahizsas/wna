auth	= function(req,res) {
	output	= module.parent.exports.output;

	getHTTPQuery	= function() {
		// HACK: this allows us to read HTTP request key/val pairs across GET/POST
		query = require('url').parse(req.url,true).query;
		if ( query == undefined )
			query = req.body;
			
		return query;
	}

	checkLogin	= function(login, pass, res) {
		// process is currently fudged with statics, should be passed off to ES

		var loginFound	= false;
		for ( var i in developmentUsers ) {
			if ( developmentUsers[i][0] == login ) {
				loginFound	= i;
				break;
			}
		}
		if ( loginFound === false ) {
			output.setResponseMessageError("No login found");
			output.setResponsePage("error");
			output.render(); // renders the error page
			return;
		}

		if ( pass != developmentUsers[loginFound][1] ) {
			output.setResponseMessageError("Bad password");
			output.setResponsePage("error");
			output.render(); // renders the error page
			return;
		}

		// else, login is good!  issue an auth token cookie thing-a-ma-jing

		issueToken();
	}

	issueToken	= function(res) {
		// should establish a token and store token in ES
		// token should reflect the roles that the user has

		// e.g. we offer 64 separate roles
	}

	sendLogin	= function() {
		res.cookie('doLogin', '1');
		res.cookie('page', 'login');
		output.setResponsePage("login");
		output.render(res);
	}

	logout	= function(req,res) {
		output.setResponsePage("login");
	}

	doingLogin	= false;
	try {
		if ( req.cookies.doLogin != undefined ) {
			// we're on the login page, yo
			doingLogin	= true;
			return true;
		}
		if ( req.cookies.authToken == undefined ) {
			console.log('no auth token, sending to login page');
			sendLogin();
			return false;
		}
		else {
			// check for token staleness
			if ( req.cookies.authToken.time == undefined && req.cookies.authToken.time ) {
				// check if cookie has expired
				// should check against database of "last request time" also in case user is
				// 	in middle of a session
			}

			return true;

			// check if token has access to requested page
			// routes.checkAccess -- no longer used
			// if not goto error page
			// if so goto the requested page
		}
	} catch (e) {
		if ( !doingLogin )
			sendLogin();
	}

	return false;
}

exports.auth	= auth;