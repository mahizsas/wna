
/**
 * Module dependencies
 */

// basic includes
express = require('express');
http    = require('http');
path    = require('path');
jade	= require('jade');
fs		= require('fs');

// compilation
compile				= require('./server/include/compile').compile;
compileModules		= require('./server/include/compile').compileModules;
compileTemplates	= require('./server/include/compile').compileTemplates;
compileDirectives	= require('./server/include/compile').compileDirectives;

// formalities...
var api		= require('./server/api').api;
var auth	= require('./server/auth').auth;
var output	= require('./server/include/output.js').output;
var app		= module.exports = express();

/**
 * Configuration
 */

// all environments
app.set('port', process.env.PORT || 3000); // we sometimes change the port
app.set('views', __dirname + '/'); // only 1 view!
app.set('view engine', 'jade');
app.set('env', 'development');
app.env	= app.get('env');

// development only
if (app.get('env') === 'development') {
	app.use(express.errorHandler());
	app.use(function(req,res,next) {
	  // allows access from a different port, good for business
	  res.header('Access-Control-Allow-Origin', '*')
	  res.header('Access-Control-Allow-Credentials', true)
	  res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
	  res.header('Access-Control-Allow-Headers', 'Content-Type')

	  return next();
	});
}

// compile template files
if ( app.get('env') === 'build' ) {
	app.use(compile);
}

// production only
if (app.get('env') === 'production') {
};

// profile is an env config whereby we are running the application 
// to test out what API requests come back
if (app.get('env') === 'profile') {
};

/**
 * Query Population & Authorization
 */

// creates an output object for this particular request
app.use(express.cookieParser(''));
app.use(function(req,res,next) {
  module.exports.output	= output(req,res);
  return next();
});

/**
 * Middleware
 */

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());

app.use(function(req,res,next) {
  if ( auth(req,res) )
    return next();
});

// are we looking for a jade file?  render it.
app.get('*.jade', function(req,res,next) {
	jade.renderFile("./client/"+req.path, {}, function(err,html) {
		res.send(html);
	});
});

// send just any old file through the pipe
app.use(express.static(__dirname+'/client'));

/**
 * Routes
 */
 

// API gets precedence
app.get('/api/',api);

// usually if we are accessing the modules folder
// or the directives folder we want to do a compile step
app.use('/modules/', function(req,res,next){
	compileModules(req,res);
});
app.use('/templates/', function(req,res,next){
	compileTemplates(req,res);
});
app.use('/directives/', function(req,res,next){
	compileDirectives(req,res);
});

// this is our "index" route
app.use('/', function(req,res,next) {
	page	= req.cookies.page;
	if ( req.cookies.page == undefined ) {
		res.cookie('page','hello');
		page	= 'hello';
	}

	query	= getHTTPQuery(req);
	if ( query.page != undefined ) {
		page	= query.page;
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

	module.exports.output.setResponsePage(page);
	module.exports.output.render(res);
});

/**
 * Start Server
 */
 
http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

