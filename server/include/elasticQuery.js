/*
	elasticSearch INPUTS:

	index
	type (see "types" fn)
	operation (see "operations" fn)
*/

// helper method

http.globalAgent.maxSockets = 1000; // config option
elasticQuery	= function(json, fn) {
	if ( fn == undefined )
		var fn	= function() {}

	checkData       = function() {
		// looking to see that the following are provied
		// type, index, operation
		if ( json.type == undefined )
			return false;
		if ( json.index == undefined )
			return false;
		if ( json.operation == undefined )
			return false;

		return true;
	}

	callback		= function(response) {
		str	= "";
		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});
		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
			fn(JSON.parse(str))
		});
	}

	buildURL        = function() {
		json.path   = json.index+"/"+json.type;

		if ( json.id == undefined )
			json.id	= module.parent.generateID(json.type);

		switch (json.operation) {
			case "search":
			case "read":
				json.path	= json.path+"/_search";
				json.method	= "get";
				break;
			case "create":
				json.path	= json.path+"/"+json.id;
			case "update":
				json.method	= "put";
				break;
			case "delete":
				json.method	= "delete";
				break;
		}

		return {
			"host": json.host,
			"port": ((json.port!=undefined)?json.port:""),
			"path": json.path,
			"method": json.method
		}
	}

	generateBitmask = function() {
		return "4294967296"; // 0xFFFF
	}

	getBody		= function() {
		switch (json.operation) {
			case "read":
				return getReadBody();
				break;
			case "search":
				return getSearchBody();
				break;
			case "create":
				return JSON.stringify(json.data)
				break;
			case "update":
				break;
			case "delete":
				break;
		}
	}

	getReadBody	= function() {
		return JSON.stringify({
		    "size": 1,
		    "query":{
		       "wildcard": {
			"id": json.data.searchID+"*"
		    }
		   }
		})
	}

	getSearchBody	= function() {
		size	= 10;
		sort	= "";
		if ( json.data.maxRecords != undefined ) {
			size	= parseInt(json.data.maxRecords);
		}
		if ( json.data.sortBy != undefined ) {
			if ( json.data.sortOperator == undefined )
				json.data.sortOperator = "asc";
			sort	= {};
			sort[json.data.sortBy] = {"order": json.data.sortOperator }
		}
		
		return JSON.stringify({
		    "size": size,
		    "sort": [
			((sort.length!=="")?sort:"")
		    ],
		    "query":{
		       "wildcard": {
			"title": "*"
		    }
		   }
		})
	}

	types           = function() {
		return [
			'ticket',
			'site',
			'company',
			'device',
			'alarm',
			'customer'
		];
	}

	operations      = function() {
		return [
			'get',
			'create',
			'update',
			'delete'
		];
	}

	putOperation    = function(obj) {
		timestamp	= (new Date).getTime();
		return {
			"timestamp": timestamp,
			"contents": obj
		}
	}

	getOperation    = function(obj) {
		timestamp	= (new Date).getTime();
		return {
			"timestamp": timestamp,
			"contents": obj
		}
	}

	require('fs').readFile('./include/elasticConfig.txt', 'utf8', function(err,data) {
		data	= JSON.parse(data);
		json	= module.parent.extend.call(data,json);
		if ( !checkData() )
			return {"errors": "bad input"};

		options = buildURL();
		theBody	= getBody();
		options.headers	= {'Content-length': theBody.length, 'Content-type': 'application/json'}
		
		req		= http.request(options,callback);
		req.write(theBody);
		req.end();
	})
}


exports.elasticQuery	= elasticQuery;