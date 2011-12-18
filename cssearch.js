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
		var curr = {token: "", next: ""};
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
	            relationship = relationships.descendant;
	            break;
	        case "+":
	            relationship = relationships.nextSibling;
	            break;
	        case ">":
	            relationship = relationships.childNode;
	            break;
	        case "~":
	            relationship = relationships.sibling;
	            break;
	        default:
				console.log(node.relationship);
				throw "ParseError";
				break;
	    }
		node.relationship = relationship;
		node.next = {token: "", relationship: ""};
		return node.next;
	}
	function breakdown(tree) {
		while (tree !== undefined) {
			var selector = tree.token;
			delete tree.token;
			var node = parse(selector);
			tree.conditions = node.conditions;
			tree = tree.next;
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
	var relationships = {
		descendant: 0,
		nextSibling: 1,
		childNode: 2,
		sibling: 3
	};
	relationships.get = function(node, relation) {
		switch(relation) {
			case relationships.descendant:
				return node.getElementsByTagName;
			case relationships.nextSibling:
				return node.nextElementSibling;
			case relationships.childNode:
				return node.children;
			case relationships.sibling:
				var siblings = [];
				while (node.nextSibling) {
					if (node.nextSibling.nodeType === 1) {
						siblings.push(node.nextSibling);
					}
					node = node.nextSibling;
				}
				return siblings;
		}
	}
	var properties = [
		[/^\w+/, function(match) {
			var name = match[0].toUpperCase();
			return function(node) {
				return node.tagName === name;
			}
		}],
		[/^\.(\w+)/, function(match) {
			var reg = new RegExp("\\b" + match[1] + "\\b");
			return function(node) {
				return reg.test(node.className);
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
		[":focus", function(node) {
			return node.ownerDocument.activeElement === node;
		}],
		[":enabled", function(node) {
			return node.disabled === false;
		}],
		[":disabled", function(node) {
			return node.disabled === true;
		}],
		[":checked"],
		[/^:nth-((?:last-)?(?:child|of-type))\(\s*([oO][dD]{2}|[eE][vV][eE][nN]|[-+]?\d+|[-+]?\d*[nN](\s*[-+]\s*\d+)?)\s*\)/, function(match) {
			if (match[2].match(/odd/i)) {
				match[2] = "2n+1";
			} else if (match[2].match(/even/i)) {
				match[2] = "2n";
			}
			function num(str) {
				var n = str.match(/n/i) !== null,
					points;
				if (n) {
					points = str.match(/([-+]?\d*)n(\s*[-+]\s*\d+)?/i);
					var reps = parseInt(points[1]);
					var offset = parseInt(points[2]);
					return function(needle, haystack) {
						var found = -1,
							i = 0,
							len = haystack.length;
						for (; i < len; ++i) {
							if (haystack[i] === needle) {
								found = i;
							}
						}
						if (found === -1) {
							return false;
						}
						return (found - offset) % reps === 0;
					}
				} else {
					points = str.match(/[-+]?\d+/);
					var offset = parseInt(points[0]);
					return function(needle, haystack) {
						return haystack[offset] === needle;
					}
				}
			}
			var find = num(match[2]);
			switch(match[1]) {
				case "last-child":
					return function(node) {
						return find(node, node.parentNode.children.reverse())
					};
				case "of-type":
					return function(node) {
						return find(node, node.parentNode.getElementsByTagName(node.tagName));
					};
				case "child":
					return function(node) {
						return find(node, node.parentNode.children);
					};
				case "last-of-type":
					return function(node) {
						return find(node, node.parentNode.getElementsByTagName(node.tagName).reverse());
					};
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
					var reg = new RegExp("\\b" + val + "\\b");
					return function(node) {
						return reg.test(node.getAttribute(attr));
					};
				case "^=":
					var reg = new RegExp("^" + val);
					return function(node) {
						return reg.test(node.getAttribute(attr));
					};
				case "$=":
					var reg = new RegExp(val + "$");
					return function(node) {
						return reg.test(node.getAttribute(attr));
					};
				case "*=":
					return function(node) {
						return node.hasAttribte(attr) && node.getAttribute(attr).indexOf(val) !== -1;
					};
				case "|=":
					var reg = new RegExp("^" + val + "-");
					return function(node) {
						return reg.test(node.getAttribute(attr));
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
	s = (function() {
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
