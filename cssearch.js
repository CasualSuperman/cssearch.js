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
				var property = {not: not, property: "", value: ""};
				specials.push(property);
				var len = special.length;
				var i = 0;
				while (i < len) {
					switch(special.charAt(i++) {
						case ":":
							
							break;
						case "[":
							var modes = {attr: 0, type: 1, inquote: 2, done: 3, escaping: 4}
							var mode = modes.attr;
							var prop = "";
							var val = "";
							var type = "";
							while (i < len && mode != modes.done;) {
								var one = special.charAt(i++);
								switch(mode) {
									case modes.attr:
										if (one.match(/^[|=^$*]$/)) {
											i--;
											mode = modes.type;
										} else if (one.match(/^]$/)) {
											mode = modes.done;
										} else {
											prop += one;
										}
										break;
									case modes.type:
										if (one.match(/^[|=^$*]$/)) {
											type += one;
										} else if (one === '"') {
											mode = modes.inquote;
										} else {
											throw "ParseError";
										}
										break;
									case modes.inquote:
										if (one.match(/^\\$/)) {
											if (one.charAt(i).match(/^["'\]$/)) {
												mode = modes.escaping;
											} else {
												throw "EscapeError";
											}
										} else if (one.match(/^[^"]$/)) {
											val += one;
										} else {
											if (special.charAt(i) === "]") {
												mode = modes.done;
												i++;
											} else {
												throw "ParseError";
											}
										}
										break;
									case modes.escaping:
										val += one;
										mode = modes.inquote;
										break;
									default:
										throw "ModeError";
										break;
								}
							}
							property.attr = prop;
							property.value = val;
							property.relation = type;
							break;
					}
					property = {not: not, property: "", value: ""};
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
	window.$s = s;
}());
