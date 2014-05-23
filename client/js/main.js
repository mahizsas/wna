// declare our app here
angular.element(document).ready(function(){
  // load the relevant the page, access control check subequently happens server-side
  var loadPage  = function() {
    window.message  = JSON.parse(JSON.parse(document.getElementById('response-message').innerHTML)).message;
    window.token    = message.token;
    httpGET("../pages/"+message.page+".html",function(s) {
      var html  = s.responseText;
      var div   = document.createElement('div');
      div.innerHTML = html;
      bodyTemplate  = document.getElementsByTagName('body')[0].appendChild(div);
      loadIncludes();
    });
  }

  // load up the css/javascript includes
  var loadIncludes = function() {
    httpGET("../includes.json",function(s) {
      window.includes = JSON.parse(s.responseText);
      loadStylesheets(includes.css); // css
      //loadAngular(includes.javascript);
      loadJavaScripts(includes.javascript); // javascript
      setTimeout(function(){
        loadModules();
        loadDirectives();
      },1000);
    });
  }

  // style like a de Franco movie and Manhattan shades
  var loadStylesheets = function(css) {
    for ( var i in css ) {
      var tag     = document.createElement('link');
      tag.setAttribute('rel','stylesheet');
      tag.setAttribute('type','text/css');
      document.getElementsByTagName('head')[0].appendChild(tag);
      tag.setAttribute('href',css[i]);
    }
  }

  var loadAngular = function(js) {
    // first we load in Angular and check for it being loaded
    //window.angular = null;
    var tag     = document.createElement('script');
    document.getElementById('app-scripts').appendChild(tag);
    tag.setAttribute('src', "http://code.angularjs.org/1.2.5/angular.min.js");
    // check for angular object
    var itv     = setInterval(function() {
      if ( angular != null ) {
        clearInterval(itv);
        loadJavaScripts(js)
      }
    },1)
  }

  var loadJavaScripts = function(js) {
    for ( var i in js ) {
      var tag     = document.createElement('script');
      document.getElementById('app-scripts').appendChild(tag);
      tag.setAttribute('src', js[i]);
    }
  }

  var loadModules = function() {
      var tag     = document.createElement('script');
      document.getElementById('app-scripts').appendChild(tag);
      tag.setAttribute('src', '/modules/');
  }

  var loadDirectives = function() {
    httpGET('../angularConfig.json', function(s) {
      json  = JSON.parse(s.responseText);
      window.angularConfig  = json;
      httpGET("/templates/?lang="+json.template_language+"&env="+json.env, function(s) {
        eval(s.responseText);
      });
    })

    // the directives folder contains the directive object, so-to-speak
    httpGET('/directives/', function(s) {
      window.directives  = JSON.parse(s.responseText);
      window.directivesLoaded = true;
    })
  }

  window.directivesLoaded = false;
  window.modulesLoaded    = false;
  window.templatesLoaded  = false;
  window.loadModulesComplete  = function() {
    window.modulesLoaded  = true;
    if ( window.modulesLoaded && window.templatesLoaded )
      angular.bootstrap(document,['app']);
  }

  window.loadTemplatesComplete  = function(directives) {
    arr = [];
    window.templates  = directives;
    fn  = function() {
      if ( !window.directivesLoaded )
        setTimeout(fn,1);
       for ( var i in directives ) {
          arr.push("directives."+i.replace(".","-"));
          name  = i.replace(".","-");
          tmp = directives[i];
          (function(name,tmp) {
          if ( window.directives[name] != undefined ) {
            defaultObj  = {
              restrict: 'E',
              transclude: true,
              scope: {},
              template: tmp
            };
            link        = undefined;
            controller  = undefined;
            rqeuire     = undefined;
            dependencies= undefined;
            scope       = undefined;
            eval(window.directives[name]);
            obj = {};
            if ( link != undefined )
              obj.link  = link;
            if ( controller != undefined )
              obj.controller  = controller;
            if ( rqeuire != undefined )
              obj.rqeuire  = rqeuire;
            if ( scope != undefined )
              obj.scope  = scope;
            if ( scope != undefined )
              obj.scope  = scope;
            jQuery.extend(defaultObj,obj);
            if ( dependencies != undefined ) {
              str = "[";
              args= "";
              for ( var j in dependencies ) {
                str+='"'+dependencies[j]+'",'
                args+=dependencies[j]+",";
              }
              args  = args.substr(0,args.length-1);
              (function(o){
                eval("fn="+str+"function("+args+"){eval(o.link = (function(){return "+o.link+"})()); return o;}]");
                angular.module('directives.'+name,[]).directive(name,fn);
              })(defaultObj);
            }
            else {
              (function(o){
                angular.module('directives.'+name,[]).directive(name,function(){
                  return o;
                });
              })(defaultObj);
            }
          }
          else {
            angular.module('directives.'+name,[]).directive(name,function(){
              defaultObj  = {
                restrict: 'E',
                transclude: true,
                scope: {},
                template: tmp
              };
              return defaultObj;
            });
          }
         })(i.replace(".","-"),directives[i])

      }
      angular.module('directives', arr);
      window.templatesLoaded  = true;

      if ( window.modulesLoaded && window.templatesLoaded )
        angular.bootstrap(document,['app']);
    } 
    if ( window.directivesLoaded )
      fn();
    else
      setTimeout(fn,1);
  }

  window.httpGET   = function(url, callback, query) {  
      var xhr;  
      if(typeof XMLHttpRequest !== 'undefined') xhr = new XMLHttpRequest();  
      else {  
          var versions = ["MSXML2.XmlHttp.5.0",   
                          "MSXML2.XmlHttp.4.0",  
                          "MSXML2.XmlHttp.3.0",   
                          "MSXML2.XmlHttp.2.0",  
                          "Microsoft.XmlHttp"]  

           for(var i = 0, len = versions.length; i < len; i++) {  
              try {  
                  xhr = new ActiveXObject(versions[i]);  
                  break;  
              }  
              catch(e){}  
           } // end for  
      }  
      xhr.onreadystatechange = ensureReadiness;  
      var args    = arguments;
      function ensureReadiness() {  
          if(xhr.readyState < 4) {  
              return;  
          }
          if(xhr.status !== 200) {
              if ( args.length > 2 && typeof args[2] == "function" )
                  args[2](xhr);
              return;  
          }
          // all is well    
          if(xhr.readyState === 4) {  
              callback(xhr);
          }
      }
      console.log(query);
      if ( query != undefined )
        url += "?q="+JSON.stringify(query);
      console.log(url);
      xhr.open('GET', url, true);
      /*
      if ( query != undefined ) {
        console.log(JSON.stringify(query));
        xhr.send('q='+JSON.stringify(query));
      }
      else
      */
      xhr.send();
  }

  loadPage();
});