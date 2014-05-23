dependencies	= ['api', '$q', '$http', '$interval'];
link	= function($scope) {
	$http({method: 'GET', url: '/api/?q='+JSON.stringify({'cmd': 'helloWorld'})}).success(function(res){
		$scope.response	= res.message;
	});
	/*
	api.request('helloWorld', {}, function(res) {
		res	= JSON.parse(res.responseText);
		$scope.$apply(function(){
			$scope.response	= res.message;
		})
	});
	*/
}