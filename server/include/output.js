exports.output	= function() {
	obj	= {};
	obj.responseMessage = {"message": {"token": "", "page": "index", "pageData": {}}, "errors": []}
	obj.setResponseToken = function(token) {
	  obj.responseMessage.message.token  = token;
	}
	obj.setResponsePage = function(page) {
	  obj.responseMessage.message.page  = page;
	}
	obj.setResponseData = function(data) {
	  obj.responseMessage.message.pageData  = data;
	}
	obj.setResponseMessage  = function(message) {
	  obj.responseMessage.message.pageData = message;
	}
	obj.setResponseError = function(msg) {
	  obj.responseMessage.errors.push(msg);
	}

	obj.render    = function(response) {
		response.render("template",{response:JSON.stringify(obj.responseMessage)})
	}

	return obj;
}
