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
	                var match = selector.charAt(i++).match(/[^ >]/);
	                if (match !== null) {
	                    if (match !== "~" || match === "~" && selector.charAt(i) === "=" || match === "+" && selector.charAt(i-2).match(/^n$/i)) {
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
			var node = parse(selector);
			tree = tree[tree["relationship"]];
		}
	}
	function parse(str) {
		var tag = str.match(/^\*/) ? ["*"] : str.match(/^\w*/);
		if (tag !== null) {
			this.tag = tag[0];
			str = str.substr(this.tag.length);
		}
		this.id = null;
		this.classes = [];
		this.properties = [];
		while (str.length > 0) {
			var func = null;
			for (var i = 0, len = properties.length; i < len && func === null; ++i) {
				var test = properties[i][0];
				switch(test.constructor) {
					case String:
						if (str.indexOf(test) == 0) {
							func = properties[i][1];
							str = str.substr(test.length);
						}
						break;
					case RegExp:
						var match = str.match(test);
						if (match !== null) {
							func = properties[i][1](match);
							str = str.substr(match[0].length);
						}
						break;
					case Function:
						var match = test(str);
						if (match.matched === true) {
							func = match;
							str = str.substr(match.length);
						}
						break;
				}
			}
			if (func !== null) {
				func.call(this);
			} else {
				console.log(str);
				throw "IllegalExpression";
			}
		}
	}
	s = function(string) {
		var parse = tree(string);
		breakdown(parse);
		return parse;
	}
	var properties = [
		[/^\.(\w+)/, function(match) {
			return function() {
				this.classes.push(match[1]);
			}
		}],
		[/^#(\w+)/, function(match) {
			return function() {
				if (this.id !== null) {
					this.properties.unshift(function() { return false; });
				} else {
					this.id = match[1];
				}
			}
		}],
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
		[":enabled"],
		[":disabled"],
		[":checked"],
		[/^:lang\((\w{2}(?:-\w{2})?)\)/],
		[/^:nth-((?:last-)?child|(?:of-)?type)\(\s*([oO][dD]{2}|[eE][vV][eE][nN]|[-+]?\d+|[-+]?\d*[nN](\s*[-+]\s*\d+)?)\s*\)/],
		[/^\[\w+\]/],
		[/^\[\w+="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+~="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\^="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\$="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\|="((?:[^"]+|(?:\\)")*)"\]/],
		[/^\[\w+\*="((?:[^"]+|(?:\\)")*)"\]/]
	];
	properties.push([function(str) {
		this.matched = str.indexOf(":not(") === 0;
		this.not = true;
		this.length = 5;
		return this;
	}]);
	properties.push([function(str) {
		this.matched = str.indexOf(")") === 0;
		this.not = false;
		this.length = 1;
		return this;
	}]);
	window.$s = s;
}());
