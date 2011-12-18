window.testing = true;
(function(){
	var s   = {},
		old = window.$s,
		win = window,
		doc = document;
	s.noConflict = function() {window.$s = old;
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
			tree.conditions = node.conditions;
			tree = tree[tree["relationship"]];
		}
	}
	function parse(str) {
		this.conditions = [];
		while (str.length > 0) {
			var slen = str.length;
			for (var i = 0, len = properties.length; i < len; ++i) {
				var test = properties[i][0];
				switch(test.constructor) {
					case String:
						if (str.indexOf(test) == 0) {
							this.conditions.push(properties[i][1]);
							str = str.substr(test.length);
							i = len;
						}
						break;
					case RegExp:
						var match = str.match(test);
						if (match !== null) {
							this.conditions.unshift(properties[i][1](match));
							str = str.substr(match[0].length);
							i = len;
						}
						break;
					case Function:
						var match = test(str);
						if (match.matched === true) {
							match.call(this);
							str = str.substr(match.length);
							i = len;
						}
						break;
				}
			}
			if (str.length === slen) {
				console.log(str);
				throw "IllegalExpression";
			}
		}
		return this;
	}
	var properties = [
		[/^\w+/, function(match) {
			var name = match[0].toUpperCase();
			return function(node) {
				return node.tagName === name;
			}
		}],
		[/^\.(\w+)/, function(match) {
			return function(node) {
				return new RegExp("\\b" + match[1] + "\\b").test(node.className);
			}
		}],
		[/^#(\w+)/, function(match) {
			return function(node) {
				return node.id === match[1];
			}
		}],
		[":root", function(node) {
			return node.parentNode === doc;
		}],
		[":first-child", function(node) {
			return node.parentNode && node.parentNode.firstChild === node;
		}],
		[":last-child", function(node) {
			return node.parentNode && node.parentNode.lastChild === node;
		}],
		[":first-of-type", function(node) {
			if (node.parentNode !== undefined) {
				var nodes = node.parentNode.getElementsByTagName(node.tagName);
				return nodes[0] === node;
			}
		}],
		[":last-of-type", function(node) {
			if (node.parentNode !== undefined) {
				var nodes = node.parentNode.getElementsByTagName(node.tagName);
				return nodes[nodes.length - 1] === node;
			}
		}],
		[":only-child", function(node) {
			if (node.parentNode !== undefined) {
				return node.parentNode.children.length === 1;		
			}
		}],
		[":only-of-type", function(node) {
			if (node.parentNode !== undefined) {
				return node.parentNode.getElementsByTagName(node.tagName).length === 1;
			}
		}],
		[":empty", function(node) {
			return node.childNodes.length === 0;
		}],
		[":link"],
		[":visited"],
		[":active"],
		[":focus", function(node) {
			return node.ownerDocument.activeElement === node;
		}],
		[":target"],
		[":enabled"],
		[":disabled"],
		[":checked"],
		[/^:nth-((?:last-)?(?:child|of-type))\(\s*([oO][dD]{2}|[eE][vV][eE][nN]|[-+]?\d+|[-+]?\d*[nN](\s*[-+]\s*\d+)?)\s*\)/, function(match) {
			if (match[2].match(/odd/i)) {
				match[2] = "2n+1";
			} else if (match[2].match(/even/i)) {
				match[2] = "2n";
			}
			switch(match[1]) {
				case "last-child":
					return function(node) {
						
					};
				case "of-type":
					break;
				case "child":
					break;
				case "last-of-type":
					break;
			}
		}],
		[/^\[(\w+)(?:([~^$|*]?=)"((?:[^"]+|(?:\\)")*)")?]/, function(match) {
			var attr = match[1];
			if (match.length === 2) {
				return function(node) {
					return node.hasAttribute(attr);
				};
			}
			var type = match[2];
			var val = match[3];
			switch (type) {
				case "=":
					return function(node) {
						return node.getAttribute(attr) === val;
					};
				case "~=":
					return function(node) {
						return new RegExp("\\b" + val + "\\b").test(node.getAttribute(attr));
					};
				case "^=":
					return function(node) {
						return new RegExp("^" + val).test(node.getAttribte(attr));
					};
				case "$=":
					return function(node) {
						return new RegExp(val + "$").test(node.getAttribte(attr));
					};
				case "*=":
					return function(node) {
						return node.hasAttribte(attr) && node.getAttribute(attr).indexOf(val) !== -1;
					};
				case "|=":
					return function(node) {
						return new RegExp("^" + val + "-").test(node.getAttribte(attr));
					};
			}
		}]
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
	s = (function(string) {
		if (doc.querySelectorAll !== undefined && !win.testing) {
			return function(query, context) {
				context = context || doc;
				return context.querySelectorAll(query);
			}
		} else {
			return function(string) {
				var parse = tree(string);
				breakdown(parse);
				return parse;
			}
		}
	}());
	win.$s = s;
}());
