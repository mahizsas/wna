module.exports.compile	= function(req,res) {
	console.log("Compiling Jade Files");

	var fs				= require('fs');
	var jade			= require('jade');
	var walk			= require('./walk.js').walk;
	// WARNING: this may break on *nix systems due to reliance of forward slash in string
	walk(__dirname+"/../../client/templates/dev/jade", function(err,files) {
		files.forEach(function(file){
			if ( file.substr(-4) != "jade" )
				return;
			filename	= file;
			dirname		= file.substr("client/templates/dev/jade".length);
			while ( filename.indexOf('/') != -1 )
				filename  = filename.substr(filename.indexOf('/')+1);
			dirname	= dirname.substr(0,dirname.indexOf(filename));
			fs.exists(__dirname+"/../../client/templates/prod/html"+dirname,function(exists) {
				if ( !exists ) {
					directory	= dirname;
					while ( directory.indexOf('/') != -1 )
						fs.mkdir("client/templates/prod/html"+dirname.substr(dirname.indexOf(directory)));
						directory	= directory.substr(directory.indexOf('/')+1);
				}
					
			})
			obj = fs.readFile("./" + file, (function(filename,dirname){return function(err,data) {
				filename	= filename.substr(0,filename.length-4)+"html";
				jade.render(data, {"pretty":true}, function(err,html) {
					fs.writeFile("client/templates/prod/html"+dirname+filename,html);
				})
			}}(filename,dirname)));

			if ( module.parent.env !== "compile" ) {
				res.send(200);
			}
		});
	});
}

module.baseDirectory	= "client/";
module.exports.compileFiles	= function(req, res, directory, output, callback) {
	console.log("Compiling Module Files");

	var fs				= require('fs');
	var uglifyJS		= require("uglify-js");
	var walk			= require('./walk.js').walk;
	res.jsContents	= "";
	res.jsLoaded	= 0;
	var itv		= null;
	// WARNING: this may break on *nix systems due to reliance of forward slash in string
	walk(module.baseDirectory+directory, function(err,files) {
		files.forEach(function(file){
			console.log(file);
			if ( file.substr(-2) != "js" )
				return;
			filename	= file;
			dirname		= file.substr(module.baseDirectory.length+directory.length);
			while ( filename.indexOf('/') != -1 )
				filename  = filename.substr(filename.indexOf('/')+1);
			dirname	= dirname.substr(0,dirname.indexOf(filename));
			
			obj = fs.readFile(file, (function(filename,dirname){return function(err,data) {
				if ( output == undefined )
					res.jsContents	+= " "+data;
				else
					res.jsContents	= output(res.jsContents, filename, ""+data);
				res.jsLoaded++;
			}}(filename,dirname)));
		});
		fn	= function() {
			if ( res.jsLoaded	>= files.length && files.length > 0 ) {
				if ( callback == undefined )
					res.jsContents	+= "; load"+directory.substr(0,1).toUpperCase()+directory.substr(1).toLowerCase()+"Complete();"
				else
					callback(res.jsContents);
				clearInterval(itv);
				//obj	= uglifyJS.minify(jsContents, {"fromString": true})
				if ( module.parent.env === "compile" )
					fs.writeFile(module.baseDirectory+directory.length+"/"+directory.toLowerCase()+".min.js", res.jsContents);
				else {
					res.send(200,res.jsContents);
				}
			}
		}
		itv	= setInterval(fn, 1)
	});
}

module.exports.compileModules	= function(req,res) {
	module.exports.compileFiles(req,res,"modules");
}

module.exports.compileDirectives	= function(req,res) {
	module.exports.compileFiles(req,res,"directives",function(contents, filename, data){
		if ( typeof contents === "string" )
			contents	= {};
		contents[filename.substr(0,filename.length-".js".length)]	= data.replace(/\t/g,' ').replace(/\r|\n/g,"\r\n");
		return contents;
	}, function(contents) {
		contents	+= " loadDirectivesComplete();";
	});
}

getHTTPQuery	= function(req) {
	// HACK: this allows us to read HTTP request key/val pairs across GET/POST
	query = require('url').parse(req.url,true).query;
	if ( query == undefined )
		query = req.body;

	return query;
}

module.exports.compileTemplates	= function(req,res) {
	query	= getHTTPQuery(req);
	console.log("Compiling Template Files");

	var fs				= require('fs');
	var uglifyJS		= require("uglify-js");
	var walk			= require('./walk.js').walk;
	res.jsContents	= "";
	res.jsFiles		= {};
	res.jsLoaded	= 0;

	if ( query.env == undefined )
		query.env	= "prod";
	if ( query.lang == undefined )
		query.lang	= "html";
	// WARNING: this may break on *nix systems due to reliance of forward slash in string
	console.log(query.env);
	console.log(query.lang);
	console.log(__dirname);
	walk("client/templates/"+query.env+"/"+query.lang, function(err,files) {
		files.forEach(function(file){
			if ( file.substr(-1*(query.lang.length)) != query.lang )
				return;
			filename	= file;
			dirname		= file.substr(("client/templates/"+query.env+"/"+query.lang).length);
			while ( filename.indexOf('/') != -1 )
				filename  = filename.substr(filename.indexOf('/')+1);
			dirname	= dirname.substr(0,dirname.indexOf(filename));
			
			obj = fs.readFile(file, (function(filename,dirname){return function(err,data) {
				res.jsFiles[filename.substr(0,filename.length-".html".length)]	= ""+data;
				res.jsLoaded++;
			}}(filename,dirname)));
		});
		fn	= function() {
			if ( res.jsLoaded	== files.length ) {
				res.jsContents	+= "loadTemplatesComplete("+JSON.stringify(res.jsFiles)+");"
				//obj	= uglifyJS.minify(jsContents, {"fromString": true})
				if ( module.parent.env === "compile" )
					fs.writeFile("client/templates/templates.min.js", res.jsContents);
				else
					res.send(200,res.jsContents);
			}
			else
				setTimeout(fn, 1)
		}
		setTimeout(fn, 1)
	});
}