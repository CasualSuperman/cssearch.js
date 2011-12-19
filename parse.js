/*!
 * CSSearcher Selector Searcher
 */
(function() {

// CSS Grammar
var reg = {};
	reg.UNICODE = '\\\\[0-9a-f]{1,6}(?:\\r\\n|[ \\n\\r\\t\\f])?';
	reg.ESCAPE = reg.UNICODE + "|" + '\\\\[^\\n\\r\\f0-9a-f]';
	reg.NONASCII = '[^\\0-\\177]';
	reg.NMSTART = '[_a-z]' + "|" + reg.NONASCII + "|" + reg.ESCAPE;
	reg.NMCHAR = '[_a-z0-9-]' + "|" + reg.NONASCII + "|" + reg.ESCAPE;
	reg.IDENT = '-?' + "(?:" + reg.NMSTART + ")(?:" + reg.NMCHAR + ")*";
	reg.NUM = '[0-9]+|[0-9]*\\.[0-9]+';
	reg.NAME = "(?:" + reg.NMCHAR + ")+";
	reg.N1 = '\\n|\\r\\n|\\r|\\f';
	reg.string1 = '"(?:[^\\n\\r\\f\\\\"]' + "|(?:\\\\" + reg.N1 + ")|(?:" + reg.NONASCII + ")|(?:" + reg.ESCAPE + "))*\"";
	reg.string2 = '\'(?:[^\\n\\r\\f\\\\\']' + "|(?:\\\\" + reg.N1 + ")|(?:" + reg.NONASCII + ")|(?:" + reg.ESCAPE + "))*'";
	reg.string3 = '(?:[^\\n\\r\\f\\\\]' + "|(?:\\\\" + reg.N1 + ")|(?:" + reg.NONASCII + ")|(?:" + reg.ESCAPE + "))*?";
	reg.STRING = reg.string1 + "|" + reg.string2 + "|" + reg.string3;

// Parser modes
var MODES = {
	NAME: { // Tag Name
		test: (function() {
			var expr = new RegExp("^(" + reg.NAME + ")", "i");
			return function(str) {
				var match = str.match(expr),
					ret   = {};
				if (match !== null) {
					ret.match   = match;
					ret.token   = match[1];
					ret.len     = match[0].length;
					ret.matched = true;
					ret.type    = TypeList.TAG;
				}
				return ret;
			};
		}()),
		exec: (function() {
			return function(match, not) {
				match = match[1].toUpperCase();
				return function(node) {
					return (node.nodeName === match) !== not;
				}
			}
		}())
	},
	CLASS: { // Class Name
		test: (function() {
			var expr = new RegExp("^\\.(" + reg.NAME + ")", "i");
			return function(str) {
				var match = str.match(expr),
					ret   = {};
				if (match !== null) {
					ret.match   = match;
					ret.token   = match[1];
					ret.len     = match[0].length;
					ret.matched = true;
					ret.type    = TypeList.CLASS;
				}
				return ret;
			};
		}()),
		exec: (function() {
			return function(match, not) {
				var expr = new RegExp("\\b" + match[1] + "\\b", "i");
				return function(node) {
					return (expr.test(node.className)) !== not;
				}
			}
		}())
	},
	ID: { // Tag ID
		test: (function() {
			var expr = new RegExp("^#(" + reg.NAME + ")", "i");
			return function(str) {
				var match = str.match(expr),
					ret   = {};
				if (match !== null) {
					ret.match   = match;
					ret.token   = match[1];
					ret.len     = match[0].length;
					ret.matched = true;
					ret.type    = TypeList.ID;
				}
				return ret;
			};
		}()),
		exec: (function() {
			return function(match, not) {
				match = match[1];
				return function(node) {
					return (node.id === match) !== not;
				}
			}
		}())
	},
	ATTR: { // [attr~="blah]
		test: (function() {
			var expr = new RegExp("^(\\[\\s*(" + reg.NAME +	")\\s*(?:([!~|^$*]?=)\\s*(" + reg.STRING + "))?\\s*\\])", "i");
			return function(str) {
					var match = str.match(expr),
						ret   = {};
					if (match !== null) {
						ret.match   = match;
						ret.token   = match[1];
						ret.len     = match[0].length;
						ret.matched = true;
						ret.type    = TypeList.ATTR;
					}
					return ret;
			};
		}()),
		exec: (function() {
			return function(match, not) {
				var attr = match[2],
					rel  = match[3],
					val  = match[4];
				if (!rel) {
					return function(node) {
						return node.hasAttribute(attr) !== not;
					}
				}
				switch(rel) {
					case "=":
						return function(node) {
							return (node.getAttribute(attr) == val) !== not;
						}
					case "!=":
						return function(node) {
							return (node.getAttribute(attr) == val) === not;
						}
					case "~=":
						if (val === "" || /\s/.test(val)) {
							return function(node) {
								return !not;
							}
						}
						var reg = new RegExp("\\b" + val + "\\b");
						return function(node) {
							return (reg.test(node.getAttribute(attr))) !== not;
						}
					case "^=":
						var reg = new RegExp("^" + val);
						return function(node) {
							return (reg.test(node.getAttribute(attr))) !== not;
						}
					case "$=":
						var reg = new RegExp(val + "$");
						return function(node) {
							return (reg.test(node.getAttribute(attr))) !== not;
						}
					case "*=":
						return function(node) {
							return (node.hasAttribute(attr) && node.getAttribute(attr).indexOf(val)) !== not;
						}
					case "|=":
						var reg = new RegExp("^" + val + "(?:-|$)");
						return function(node) {
							return (reg.test(node.getAttribute(attr))) !== not;
						}
				}
			}
		}())
	},
	PSEUDO: { // :first-child
		test: (function() {
			var matches = [
				/^:(?:(first|last|only)-(child|of-type))/i,
				/^:(?:empty|enabled|checked|disabled|target|root)/i,
				/^:(?:text|password|submit|image|file|reset|button|checkbox|input)/i // Not part of spec.
				],
				len = matches.length;
			return function(str) {
					if (str.indexOf(":") === 0) {
						var length = len,
							i      = 0;
						for (;i < length; i++) {
							var match = str.match(matches[i]),
								ret   = {};
							if (match !== null) {
								ret.match    = match;
								ret.matched = true;
								ret.token   = match[0];
								ret.len     = match[0].length;
								ret.type    = TypeList.PSEUDO;
								return ret;
							}
						}
					}
					return {};
			};
		}()),
		exec: (function() {
			function hasParent(node) {
				return !!node.parentNode;
			}
			return function(match, not) {
				var selector = match[0];
				if (/-/.test(selector)) { // first-child, etc.
					var first  = match[1],
						second = match[2];
					switch (first) {
						case "first":
							if (second === "child") {
								return function(node) {
									return (hasParent(node) && node.parentNode.firstChild === node) !== not;
								}
							} else {
								return function(node) {
									return (hasParent(node) && node.parentNode.getElementsByTagName(node.nodeName)[0] === node) !== not;
								}
							}
						case "only":
							if (second === "child") {
								return function(node) {
									return (hasParent(node) && node.parentNode.childNodes.length === 1) !== not;
								}
							} else {
								return function(node) {
									if (!hasParent(node)) return not;
									var children  = node.parentNode.childNodes,
										nodeName = node.nodeName,
										count    = 0,
										i;
									for (i = children.length - 1; i >= 0; --i) {
										if (children[i].nodeName === nodeName)
											if (children[i] !== node)
												return not;
									}
									return !not;
								}
							}
						case "last":
							if (second === "child") {
								return function(node) {
									return (hasParent(node) && node.parentNode.lastChild === node) !== not;
								}
							} else {
								return function(node) {
									if (!hasParent(node)) return not;
									var children  = node.parentNode.childNodes,
										nodeName = node.nodeName,
										i;
									for (i = children.length - 1; i >= 0; --i) {
										if (children[i].nodeName === nodeName)
											return (children[i] === node) !== not;
									}
								}
							}
					}
				} else { // Others.

				}
			}
		}())
	},
	NTH: {
		test: (function() {
			var expr = /^:(nth(?:-last)?)-(child|of-type)\(\s*([^)]*)\s*\)/i;
			return function(str) {
				var ret = {},
					match;
				if (str.indexOf(":nth-") !== 0) {
					return ret;
				}
				match = str.match(expr);
				if (match === null) {
					return ret;
				}
				ret.match   = match;
				ret.matched = true;
				ret.token   = match[0];
				ret.len     = match[0].length;
				ret.type    = TypeList.ATTR_NTH;
				return ret;
			}
		}()),
		exec: (function() {return function() {}}())
	},
	CONTAINS: { // :contains(selectors)
		test: (function() {
			var expr = /^:contains\(\s*/i;
			return function(str) {
				var ret = {},
					match = str.match(expr);
				if (match !== null) {
					ret.match   = match;
					ret.matched = true;
					ret.token   = ":contains("
					ret.len     = match[0].length;
					ret.type    = TypeList.CONTAINS_BEGIN;
				}
				return ret;
			}
		}()),
		exec: (function() {}())
	},
	NOT: { // :not(.hot)
		test: (function() {
			var test = /^:not\(\s*/i;
			return function(str) {
					var ret = {},
						match = str.match(test);
					if (match !== null){
						ret.match   = match;
						ret.matched = true;
						ret.token   = ":not(";
						ret.len     = match[0].length;
						ret.type    = TypeList.NOT_BEGIN;
					}
					return ret;
			};
		}()),
		exec: (function() {}())
	},
	FUNC_END: { // end paren of a functional pseudo-selector
		test: (function() {
			var end = /^\s*\)/;
			return function(str) {
				var ret = {},
					match = str.match(end);
				if (match !== null) {
					ret.match   = match;
					ret.matched = true;
					ret.token   = ")";
					ret.len     = match[0].length;
					ret.type    = TypeList.FUNC_END;
				}
				return ret;
			}
		}()),
		exec: (function() {}())
	},
	RELATION: { // +, >, etc..
		test: (function() {
			var notnot = /^\s*\)/,
				expr = /^\s*([- +>~,])\s*/;
			return function(str) {
					var ret = {};
					if (notnot.test(str))
						return ret;
					var match = str.match(expr);
					if (match !== null) {
						ret.match   = match;
						ret.matched = true;
						ret.token   = match[1];
						ret.len     = match[0].length;
						ret.type    = relationship[match[1]];
					}
					return ret;
			};
		}()),
		exec: (function() {
			return function(selector) {
				return function(next, context) {
					return context.getElementsByTagName(next.nodeName);
				}
			}
		}())
	}
}
// Modes in the order they should be checked.
var ModeList = [
	MODES.NAME,
	MODES.ID,
	MODES.CLASS,
	MODES.RELATION,
	MODES.NOT,
	MODES.PSEUDO,
	MODES.ATTR,
	MODES.FUNC_END,
	MODES.NTH,
	MODES.CONTAINS
];

// Node types.
var TypeList = {
	ID:                  0,
	TAG:                 1,
	CLASS:               2,
	PSEUDO:              3,
	ATTR:                4,
	NOT_BEGIN:           5,
	FUNC_END:            6,
	DESCENDANT_NODE:     7,
	CHILD_NODE:          8,
	NEXT_ELDEST_SIBLING: 9,
	YOUNGER_SIBLING:     10,
	LIST:                11,
	ATTR_NTH:            12,
	CONTAINS_BEGIN:      13
}

// Relationship modifiers
var relationship = {
	"+": TypeList.NEXT_ELDEST_SIBLING,
	" ": TypeList.DESCENDANT_NODE,
	">": TypeList.CHILD_NODE,
	"~": TypeList.YOUNGER_SIBLING,
	",": TypeList.LIST
};

var parse = function(string) {
	var nodes     = [],
		pos       = 0,
		modeStack = [],
		modes     = ModeList,
		modeCount = modes.length;

	while (string.length) {
		var matched = false;
		for (var i = 0; i < modeCount && !matched; ++i) {
			var match = modes[i].test(string);
			matched = match.matched;
			if (matched) {
				string = string.substr(match.len);
				nodes.push(match);
			}
		}
		if (!matched) {
			throw "ParseError";
		}
	}
	return nodes;
};

var combine = function(nodes) {
	var groups  = [],
		objects = [],
		object  = baseObject(),
		i       = 0,
		len     = nodes.length,
		modes   = MODES,
		type    = TypeList;
	for (; i < nodes.length; i++) {
		var node = nodes[i];
		switch (node.type) {
			case type.NEXT_ELDEST_SIBLING :
			case type.DESCENDANT_NODE     :
			case type.CHILD_NODE          :
			case type.YOUNGER_SIBLING     :
				if (! object.not) {
					object.next = modes.RELATION.exec(node.type);
					objects.push(object);
					object = baseObject();
				} else {

				}
				break;
			case type.LIST :
				if (! object.not) {
					objects.push(object);
					groups.push(objects);
					object = baseObject();
					objects = [];
				} else {

				}
				break;
			case type.TAG :
				if (object.not)
					object.attributes.unshift(modes.NAME.exec(node.match, object.not));
				else
					object.nodeName = node.match[1];
				break;
			case type.ID :
				if (object.not)
					object.attributes.unshift(modes.ID.exec(node.match, object.not));
				else
					object.id = node.match[1];
				break;
			case type.CLASS :
				object.classes.push(modes.CLASS.exec(node.match, object.not));
				break
			case type.PSEUDO :
				object.attributes.push(modes.PSEUDO.exec(node.match, object.not));
				break;
			case type.ATTR :
				object.attributes.unshift(modes.ATTR.exec(node.match, object.not));
				break;
			case type.CONTAINS_BEGIN :
				if (object.not || object.contains) throw "IllegalNestedFunctionalSelector";
				object.contains = true;
				break;
			case type.NOT_BEGIN :
				if (object.not || object.contains) throw "IllegalNestedFunctionalSelector";
				object.not = true;
				break;
			case type.FUNC_END :
				if (!object.not && !object.contains) throw "ExtraCloseParen";
				object.not = false;
				object.contains = false;
				break;
			case type.ATTR_NTH :
				object.attributes.push(modes.NTH.exec(node.match, object.not));
				break;
			default:
				throw "IllegalNodeError";
		}
	}
	if (object.not) {
		throw "UnclosedNotException";
	}
	objects.push(object);
	groups.push(objects);
	return groups;
};
var baseObject = function() {
	return {
		nodeName  : "*",
		classes   : [],
		attributes: [],
		not       : false
	};
}

window["$s"] = function(str, context) {
	context = context || document;
	return combine(parse(str));
}

}());
