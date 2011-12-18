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
					console.log("Selector:", match);
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
					console.log("Relationship:", match);
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
			tree.tagName = node.tagName;
			tree.conditions = node.conditions;
			tree.get = function(node) {
				return function() {
					return get.call(node);
				};
			}(tree);
			tree = tree.next;
		}
	}
	function parse(str) {
		this.tagName = "*";
		var tag = str.match(/^\w+/);
		if (tag !== null) {
			this.tagName = tag[0].toUpperCase();
			str = str.substr(tag[0].length);
		}
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
	function get() {
		console.log(this);
		var elems = doc.getElementsByTagName(this.tagName);
		console.log(elems);
		var results = [];
		for (var i = 0, len = elems.length; i < len; ++i) {
			var passed = true;
			for (var a = 0, len2 = this.conditions.length; a < len2 && passed; ++a) {
				if (! this.conditions[a](elems[i])) {
					passed = false;
				}
			}
			if (passed) {
				results.push(elems[i]);
			}
		}
		console.log(results);
		var next = [];
		for (var i = 0, len = results.length; i < len; ++i) {
			next.push(relationships.get(results[i], this.relationship, this.next.tagName)); 
		}
		console.log(next);
		return next;
	}
	var relationships = {
		descendant: 0,
		nextSibling: 1,
		childNode: 2,
		sibling: 3
	};
	relationships.get = function(node, relation, tagName) {
		switch(relation) {
			case relationships.descendant:
				return node.getElementsByTagName(tagName);
			case relationships.nextSibling:
				if (node.nextSibling.nodeType === 1 && node.nextSibling.nodeName === tagName)
					return [node.nextSibling];
				return [];
			case relationships.childNode:
				var children = [],
					childNodes = node.childNodes;
					for (var i = 0, len = childNodes.length; i < len; ++i) {
						if (childNodes[i].nodeName === tagName) {
							children.push(childNodes[i]);
						}
					}
				return children;
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
				var nodes = node.parentNode.getElementsByTagName(node.nodeName);
				return nodes[0] === node;
			}
		}],
		[":last-of-type", function(node) {
			if (node.parentNode !== undefined) {
				var nodes = node.parentNode.getElementsByTagName(node.nodeName);
				return nodes[nodes.length - 1] === node;
			}
		}],
		[":only-child", function(node) {
			if (node.parentNode !== undefined) {
				var children = node.parentNode.childNodes;
				var nodeCount = 0;
				for (var i = 0, len = children.length; i < len && nodeCount < 2; ++i) {
					if (children[i].nodeType === 1)
						nodeCount++;
				}
				return nodeCount === 1;
			}
		}],
		[":only-of-type", function(node) {
			if (node.parentNode !== undefined) {
				return node.parentNode.getElementsByTagName(node.nodeName).length === 1;
			}
		}],
		[":empty", function(node) {
			var children = node.childNodes;
			for (var i = 0, len = children.length; i < len; ++i) {
				if (children[i].nodeType === 1) {
					return false;
				}
			}
			return true;
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
		[":checked", function(node) {
			return node.checked === true;
		}],
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
						return find(node, node.parentNode.childNodes.reverse())
					};
				case "of-type":
					return function(node) {
						return find(node, node.parentNode.getElementsByTagName(node.nodeName));
					};
				case "child":
					return function(node) {
						return find(node, node.parentNode.childNodes);
					};
				case "last-of-type":
					return function(node) {
						return find(node, node.parentNode.getElementsByTagName(node.nodeName).reverse());
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
						return node.hasAttribute(attr) && node.getAttribute(attr).indexOf(val) !== -1;
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
