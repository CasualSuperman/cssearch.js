(function(){
	var s   = {},
		old = window.$s;
	s.noConflict = function() {
		window.$s = old;
		return s;
	}
	function tree(selector) {
		var curr = {token: "", relationship: ""};
		var tree = curr;
	    var len = selector.length;
	    var i = 0;
	    var modes = {selector: 0, relationship: 1};

	    var mode = modes.selector;

		while (i < len) {
	        switch (mode) {
	            case modes.selector:
	                var match = selector.charAt(i++).match(/[^ +>]/);
	                if (match !== null) {
	                    if (match !== "~" || match === "~" && selector.charAt(i) === "=") {
	                        curr.token += match;
	                    } else {
	                        i -= 1;
	                        mode = modes.relationship;
	                    }
	                } else {
	                    mode = modes.relationship;
	                    i--;
	                }
	                break;
	            case modes.relationship:
	                var match = selector.charAt(i++).match(/[ +>~]/);
	                if (match === null) {
	                    i--;
	                    mode = modes.selector;
	                    curr = newCurrent(curr);
	                } else {
	                    curr.relationship += match;
	                }
	                break;
	            default:
	                console.log("Illegal state.");
	                console.log("Mode = ", mode);
	                i = len;
	                break;
	        }
		}
		return tree;
	}
	function newCurrent(node) {
	    var relationship;
	    switch (node.relationship.trim()) {
	        case "":
	            relationship = "descendant";
	            break;
	        case "+":
	            relationship = "nextSibling";
	            break;
	        case ">":
	            relationship = "childNode";
	            break;
	        case "~":
	            relationship = "sibling"
	            break;
	        default:
				console.log(node.relationship);
	            throw "ParseError";
	            break;
	    }
		node["relationship"] = relationship;
		node[relationship] = {token: "", relationship: ""};
		return node[relationship];
	}
	function breakdown(tree) {
		while (tree !== undefined) {
			var selector = tree.token;
			delete tree.token;
			var tag = selector.match(/^\*/) ? ["*"] : selector.match(/^\w*/);
			if (tag !== null) {
				tree.tag = tag[0];
			}
			var id = selector.match(/#\w+/);
			if (id !== null) {
				tree.id = id[0];
			}
			var className = selector.match(/\.\w+/);
			if (className !== null) {
				tree.className = className[0];
			}
			var specials = selector.match(/:|\[.+$/);
			if (specials !== null) {
				var special = specials[0];
				var specials = [];
				var not = false;
				while (special.length > 0) {
					var property = {not: not, property: "", value: ""};
					var func = null;
					for (var i = 0, len = properties.length; i < len && func === null; ++i) {
						var test = properties[i][0];
						switch(test.constructor) {
							case RegExp:
								var match = special.match(test);
								if (match !== null) {
									property.str = match[0];
									func = properties[i][1];
									special = special.substr(match[0].length);
								}
								break;
							case String:
								if (special.indexOf(test) == 0) {
									property.str = test;
									func = properties[i][1];
									special = special.substr(test.length);
								}
								break;
							case Function:
								var match = test(special);
								if (match.matched === true) {
									property.str = match.str;
									func = match;
									special = special.substr(match.length);
								}
								break;
						}
						var match = special.match(properties[i][0])
						if (match !== null) {
							property.str = match[0];
							func = properties[i][1](match);
							special = special.substr(match[0].length);
						}
					}
					if (func === null) {
						throw "ParseError";
					}
					specials.push(property);
				}
				tree.specials = specials;
			}
			tree = tree[tree["relationship"]];
		}
	}
	s = function(string) {
		var parse = tree(string);
		breakdown(parse);
		return parse;
	}
	var properties = [
		[":root"],
		[":first-child"],
		[":last-child"],
		[":first-of-type"],
		[":last-of-type"],
		[":only-child"],
		[":only-of-type"],
		[":empty"],
		[":link"],
		[":visited"],
		[":active"],
		[":hover"],
		[":focus"],
		[":target"],
		[":lang\(\w\w\)"],
		[":enabled"],
		[":disabled"],
		[":checked"],
		["::first-line"],
		["::first-letter"],
		["::before"],
		["::after"],
		[/^:nth-child\(\d+\)/],
		[/^:nth-last-type\(\d+\)/],
		[/^:nth-of-type\(\d+\)/],
		[/^:nth-last-of-type\(\d+\)/],
		[/^\[\w+\]/],
		[/^\[\w+="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+~="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\^="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\$="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\|="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\*="((?:[^"]+|(?:\\)")*)"\]/],
		[/^:not\(([a-zA-Z]+|\*)?((\.\w+)(#\w+)?|(#\w+\.\w+))?(::?\w+)?\)/]
	];
	for (var i = 0; i < properties.length; i++) {
		properties[i][1] = function(){};
	}
	window.$s = s;
}());
