	var s   = {},
		old = window.$s;
	s.noConflict = function() {
		window.$s = old;
		return s;
	}
	function tree(selector) {
		var curr = {token: "", relationship: ""};
		var tree = {root: curr};
	    var len = selector.length;
	    var i = 0;
	    var modes = {selector: 0, relationship: 1};

	    var mode = modes.selector;

		while (i < len) {
	        switch (mode) {
	            case modes.selector:
	                var match = selector.charAt(i++).match(/[^ +>]/);
	                if (match !== null) {
	                    console.log(i-1, match);
	                    if (match !== "~" || match === "~" && selector.charAt(i) === "=") {
	                        curr.token += match;
	                    } else {
	                        i -= 1;
	                        mode = modes.relationship;
	                    }
	                } else {
	                    console.log("Switching to relationship");
	                    mode = modes.relationship;
	                    i--;
	                }
	                break;
	            case modes.relationship:
	                var match = selector.charAt(i++).match(/[ +>~]/);
	                if (match === null) {
	                    console.log("Switching to selector.");
	                    i--;
	                    mode = modes.selector;
	                    curr = newCurrent(curr);
	                } else {
	                    console.log(i-1, match);
	                    curr.relationship += match;
	                }
	                break;
	            default:
	                console.log("Illegal state.");
	                console.log("Mode = ", mode);
	                i++;
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
	            throw "ParseError";
	            break;
	    }
		node["relationship"] = relationship;
		node[relationship] = {token: ""};
		return node[relationship];
	}
	s = function(string) {
		return tree(string);
	}
	window.$s = s;
