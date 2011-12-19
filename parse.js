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
	reg.STRING = reg.string1 + "|" + reg.string2;

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
		exec: (function() {}())
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
		exec: (function() {}())
	},
	ATTR: { // [attr~="blah]
		test: (function() {
			var expr = new RegExp("^(\\[\\s*(" + reg.NAME +	")\\s*(?:([~|^$*]?=)\\s*(" + reg.STRING + "))?\\s*\\])", "i");
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
		exec: (function() {}())
	},
	PSEUDO: { // :first-child
		test: (function() {
			var matches = [
				/^:(?:(?:first|last|only)-(?:child|of-type))/i,
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
		exec: (function() {}())
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
		exec: (function() {}())
	},
	NOT: { // :not(.hot)
		test: (function() {
			var test = /^(?::not\(\s*|\s*\))/i,
				begin = /^:not\(\s*/i,
				end = /^\s*\)/;
			return function(str) {
					var ret = {};
					if (test.test(str)){
						var ends = str.match(end);
						if (ends !== null) {
							ret.match   = ends;
							ret.matched = true;
							ret.token   = ")";
							ret.len     = ends[0].length;
							ret.type    = TypeList.NOT_END;
						} else {
							var begins = str.match(begin);
							if (begins !== null) {
								ret.match   = begins;
								ret.matched = true;
								ret.token   = ":not(";
								ret.len     = begins[0].length;
								ret.type    = TypeList.NOT_BEGIN;
							}
						}
					}
					return ret;
			};
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
		exec: (function() {}())
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
	MODES.NTH
];

// Node types.
var TypeList = {
	ID:                  0,
	TAG:                 1,
	CLASS:               2,
	PSEUDO:              3,
	ATTR:                4,
	NOT_BEGIN:           5,
	NOT_END:             6,
	DESCENDANT_NODE:     7,
	CHILD_NODE:          8,
	NEXT_ELDEST_SIBLING: 9,
	YOUNGER_SIBLING:     10,
	LIST:                11,
	ATTR_NTH:            12
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
	var objects = [],
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
			case type.LIST                :
				objects.push(object);
				object = baseObject();
				break;
			case type.TAG :
				if (object.not)
					object.attributes.unshift(modes.NAME.exec(node.match, object.not));
				else
					object.nodeName = node.match[0];
				break;
			case type.ID :
				object.id = modes.ID.exec(node.match, object.not);
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
			case type.NOT_BEGIN :
				if (object.not) throw "IllegalNestedNot";
				object.not = true;
				break;
			case type.NOT_END :
				if (!object.not) throw "ExtraCloseParen";
				object.not = false;
				break;
			case ATTR_NTH :
				object.attributes.push(modes.NTH.exec(node.match, object.not));
				break;
			default:
				throw "IllegalNodeError";
		}
	}
	objects.push(object);
	return objects;
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
