;(function( $, window, undefined ){
	"use strict";
	
	var INIT_FUNCTIONS = {},	// remember initialization functions
	DOM_MAP = {};	// remember all forms

// make sure we have a endsWith	
if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}
	
	/**
	 * @param element {Node} the cotnainer node that should be converted to a jsonSite
	 * @param options {object} the configuraton object
	 * @constructor
	 */
	function JsonSite (element, options) {
		var $this = $(element);
		
		// create the options
		this.options = $.extend({}, {
			/**
			 * template folder
			 */
			tplUri: "",
			/**
			 * the object used to fill/collect data
			 */
			data: null,
		}, options);
		
		// normalize path
		if(this.options.tplUri.length > 0 ) {
			if(this.options.tplUri.endsWith("/")) {
				this.options.tplUri = this.options.tplUri.substring(this.options.tplUri.length - 1);
			}
		}

		this.element = element;
		this.modules = [];
		this.templates =  {};
		this._init();
	}
	
	/**
	 * workaround for ie <= 8 bugs 
	 * @private
	 */
	JsonSite.prototype._isIE = function() {
	    if (typeof navigator !== "undefined" && navigator.appName == 'Microsoft Internet Explorer') {
		    var rv = -1; // Return value assumes failure.
	        var ua = navigator.userAgent;
	        var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
	        if (re.exec(ua) != null)
	            rv = parseFloat(RegExp.$1);
	        return rv <= 8;
	    }
	    
	    return false;
	};
	
	/**
	 * helper function for debug
	 * @param msg the msg to print
	 * @private
	 */
	JsonSite.prototype._debug = function(msg) {
		if(typeof console !== "undefined") {
			console.log(msg);
		}
	};

	/**
	 * warning message
	 * @param msg the msg to print
	 * @private
	 */
	JsonSite.prototype._warn = function(msg) {
		if(typeof console !== "undefined") {
		  try {
			   // Code throwing an exception
			  throw new Error("stack");
		  } catch(e) {
			  console.log("WARNING " + this.id + ": " + msg + "\n Stacktrace: " + (e.stack || e.stacktrace));
		  }
		}
	};
	/**
	 * Start analyzing the structure. find each "module" and load the templates
	 */
	JsonSite.prototype._init = function() {
		var $this = $(this.element),
			that = this;
			
		// load each module
		$this.find(".module").each(function(){
			var module = {};
			try {
				module.config = JSON.parse($(this).attr("data-config"));
			} catch(ex) {
				that._warn("Invalid configuration for module: " + $(this).attr("data-config") + "\n" + ex);
				return;
			}
			module.element = this;
			
			// initialize the data fields
			if(module.config.data)
				for(var field in module.config.data) {
					if(module.config.data[field].split)
						module.config.data[field] = module.config.data[field].split(".");
				}
			module.templates = [];
			
			that._debug("found module: " + module.config.template);
			$(this).data().module = module;
			
			// load the template (and display)
			that._show(module.config.template, module);
			
			that.modules.push(module);
		});
	};
	
	/**
	 * render the data for a module and display it
	 * @param template {string} the template to read (url)
	 */
	JsonSite.prototype._show = function(template, module) {
		module.currentTemplate = template;
		this._renderData(module.currentTemplate, this._extractData(module), module.templates);
	};

	/**
	 * update the internal data structure. This will trigger updates!
	 * Note that each level that has updated/changed data will produce an event!
	 * 
	 * @param diffData {object} the data structure to update.
	 */
	JsonSite.prototype.update = function(diffData) {
		var that = this;
		that._entityExtend(that.options.data, diffData);
		alert(that.options.data.toSource());
	};
	
	/**
	 * Extended version of the jquery extend function as found in
	 * http://code.jquery.com/jquery-1.10.1.js
	 * this will merge entity arrays by comparing their ids instead of simply
	 * replacing the whole array. To remove an element with an id simply pass
	 * the entry with JUST an id (no other fields)
	 * @param target the target of the extention
	 * @param src the src
	 * @return the updated target
	 * @private
	 */
	JsonSite.prototype._entityExtend = function() {
		var src, copy, name, options, clone,
			target = arguments[0] || {},
			i = 1,
			length = arguments.length,
			deep = false;
		
		// Handle case when target is a string or something (possible in deep copy)
		if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
			target = {};
		}
		
		for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
				for ( name in options ) {	
					src = target[ name ];
					copy = options[ name ];
					
					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}
					
					
					if(copy && $.isPlainObject(copy)) {
						// Recurse if we're merging plain objects
						clone = src && jQuery.isPlainObject(src) ? src : {};
						target[name] = this._entityExtend(clone, copy);
					} else if(copy && $.isArray(copy)) {
						if(copy.length == 0) {
							// empty array: clean target
							target[name] = [];
						} else if(src && src.length > 0 && $.isPlainObject(copy[0]) && copy[0].id !== undefined) {
							// if the first copy element is an object and contains an id -> resolve each element
							for(var j = 0; j < copy.length; j++) {
								var found = false;
								for(var k=0; k < src.length; k++) {
									if(src[k].id === copy[j].id) {
										if(this._moreThanOneProp(copy[j]) === false) {
											src.splice(k,1);
										}
										else {
											this._entityExtend(src[k], copy[j]);
										}
										found = true;
										break;
									}
								}
								if(!found) {
									if(this._moreThanOneProp(copy[j]) === true) {
										src.push($.extend({}, copy[j]));
									}
								}
							}
						} else {
							clone = src && jQuery.isPlainObject(src) ? src : [];
							target[name] = this._entityExtend(clone, copy);
						}
					} else if ( copy !== undefined ) {
						// Don't bring in undefined values
						target[ name ] = copy;
					}
				}
			}
		}
		
		// Return the modified object
		return target;
	};
	
	/**
	 * internal function that returns true if a given object has 
	 * more than one property.
	 * @private
	 */
	JsonSite.prototype._moreThanOneProp = function(obj) {
		var c = 1;
		for(var x in obj) {
			if(c-- === 0)
				return true;
		}
		return false;
	};
	
	/**
	 * retrieve the data requested by a certain module. The data object is stored globally
	 * and certain parts are extracted
	 * @param module the module to extract the data for
	 * @private
	 */
	JsonSite.prototype._extractData = function(module) {
		var data = {},
			that = this;
		if(!that.options.data) {
			that._warn("No valid data to extract");
			return null;
		}
		
		for(var field in module.config.data) {
			that._debug("getting: " + field);
			var cdata = that._get(that.options.data, module.config.data[field]);
			if(cdata) {
				data[field] = cdata;
			}
		}
		return data;
	};
	
	/**
	 * Retrieve a value from a given object using the naming in prm
	 * @param obj the original object to retrieve the data from
	 * @param prm the string array to use when getting the field
	 * @private
	 */
	JsonSite.prototype._get = function(obj, prm) {
		var ret = null, p, i;
		if (!obj) {
			return null;
		}

		try {
			i = prm.length; 
			if(i) {
				ret = obj;
				while(ret && i--) {
					p = prm.shift();
					ret = ret[p];
				}
			}
		} catch(e) { /* ignore */ }
		return ret;
	};
	
	/**
	 * internal function to prepare rendering.
	 * @param template {string} the template to read (url)
	 * @param data {object} the data object (optional)
	 * @param callback {function(rendered,template,data)} the rendered string is passed to that callback as parameter for insertion
	 */
	JsonSite.prototype._renderData = function(template, data, templateCache, callback) {
		var that = this;
		
		this._debug("render using: " + template + " and " + data.toSource());
		
		// parameter fixing
		if($.isFunction(data)) {
			callback = data;
			data = null;
		}

		// simple binding: only data
		var bindings = {
				data: data,
				// the url is based on the id
				baseUrl: this.options.tplUri
		};
		
		// take the template from the global cache
		if(templateCache && templateCache[template]) {
			this._debug("Using template from global cache: " + template);
			if(!data) {
				// no data - just pass the template for rendering
				callback(templateCache[template], template);
			} else {
				// call with the data rendered
				callback($(templateCache[template].render(bindings)), template, data);
			}
			return;
		}


		// get the web template
		$.get({
			  contentType: 'text/plain; charset=UTF-8',
			  url: this.options.tplUri + template,
			  dataType: "text",
			  success: function(templateData){
			  alert("HI");
			  alert("HI");
					if(templateData) {
						var templateCache = that.templates;
						if(!templateCache) {
							templateCache = {};
							that.templates = templateCache;
						}
						
						that._debug("compiling fetched template: " + template);
						var mustache = null;
						if(typeof Hogan !== "undefined") {
							mustache = Hogan.compile(templateData);
						} else {
							// handlebars returns a function - hogan an object with render
							mustache = {
									render: Handlebars.compile(templateData)
							};
						}
						// cache the rendered template
						templateCache[template] = mustache;
						
						if(!data) {
							callback(mustache, template);
						} else {
							callback($(mustache.render(bindings)), template, data);
						}
					}
				} 
			});
	};
	
	/**
	 * destroy the jsonSite  and its resources.
	 * @private
	 */
	JsonSite.prototype.destroy = function( ) {
		return $(this.element).each(function(){
			$(window).unbind('.jsonSite');
			$(this).removeData('jsonSite');
		});
	};

	// init and call methods
	$.fn.jsonSite = function ( method ) {
		// Method calling logic
		if ( typeof method === 'object' || ! method ) {
			return this.each(function () {
				if (!$(this).data('jsonSite')) {
					$(this).data('jsonSite', new JsonSite( this, method ));
				}
			});
		} else {
			var args = Array.prototype.slice.call( arguments, 1 ),
				jsonSite;
			// none found
			if(this.length === 0) {
				return null;
			}
			// only one - return directly
			if(this.length === 1) {
				jsonSite = $(this).data('jsonSite');
				if (jsonSite) {
					if(method.indexOf("_") !== 0 && jsonSite[method]) {
						var ret =  jsonSite[method].apply(jsonSite, args);
						return ret;
					}
					
					$.error( 'Method ' +  method + ' does not exist on jQuery.jsonSite' );
					return false;
				}
			}
			
			return this.each(function () {
				jsonSite = $.data(this, 'jsonSite'); 
				if (jsonSite) {
					if(method.indexOf("_") !== 0 && jsonSite[method]) {
						return jsonSite[method].apply(jsonSite, args);
					} else {
						$.error( 'Method ' +  method + ' does not exist on jQuery.jsonSite' );
						return false;
					}
				}
			});
		}   
	};
		
	/**
	 * global jsonSite function for intialisation
	 */
	$.jsonSite = function ( name, initFunc ) {
		var jsonSites = DOM_MAP[name];
		// initFunc is a function -> initialize
		if($.isFunction(initFunc)) {
			// call init if already initialized
			if(jsonSites) {
				$.each(jsonSites, function(){
					initFunc(this, $(this.element));
				});
			}
			
			// remember for future initializations
			INIT_FUNCTIONS[name] = initFunc;
		} else {
			// call init if already initialized
			if(jsonSites) {
				var method = initFunc;
				var args = Array.prototype.slice.call( arguments, 2 );
				$.each(portlets, function(){
					this[method].apply(this, args);
				});
			}
		}
	};
})( jQuery, window );
