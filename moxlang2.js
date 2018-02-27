// Moxlang v0.2 - see moxlang.com for licensing
var debug = 1;
var panic = false;
function d(level, code, msg) {
    if (level <= debug) console.log(code + '   ' + msg);
}
function run() {
    // Set DOM objects
    var code = document.getElementById('code').value;
    var out =  document.getElementById('output');
    out.style.display = 'block';
    out.innerText = '';
    // Parse and prepare
    var functions = functionize(code);
    var variables = {};
    // Executin'
    if (!functions.M) out.innerText = 'No main function M';
    else execute(functions.M, functions, variables, out);
}
function functionize(code) {
    var functions = {};
    var parts = code.split('$');
    parts.forEach(function(part) {
        if (part.length == 0 || part[9] == '#') return;
        functions[part[0]] = part.substring(1, 9999);
    });
    return functions;
}
function execute(func, functions, variables, out, looping) {
    var loopcount = 0;
    var prev = null;
    var tempnum = '';
    var tempstr = ''; var instr = false;
    var tempop = null;
    var temploop = ''; var inloop = false;
    var inhash = false;
    for (var i = 0; i < func.length && !panic; i++) {
        if (func[i] == '#' && !inhash && !instr) {
            inhash = true;
        } else if (inhash && func[i] != '#') {
            // Inside comment
        } else if (inhash && func[i] == '#') {
            inhash = false;
        } else if (func[i] == '{' && !instr) {
            d(2, func[i], 'Start loop');
            inloop = true;
        } else if (inloop && func[i] != '}') {
            d(3, func[i], 'Append loop');
            temploop += func[i];
        } else if (inloop && func[i] == '}') {
            d(2, ' ', 'Executing loop');
            execute(temploop, functions, variables, out, true);
            d(2, func[i], 'End loop');
            temploop = '';
            inloop = false;
        } else if (func[i] == '\'' && !instr) {
            d(2, func[i], 'Start string');
            instr = true;
        } else if (instr && func[i] != '\'') {
            d(3, func[i], 'Append string');
            tempstr += func[i];
        } else if (instr && func[i] == '\'') {
            d(2, func[i], 'End string');
            instr = false;
        } else if (func[i] == '@') {
            d(1, func[i], 'Executing function');
            execute(functions[func[i+1]], functions, variables, out);
            i++;
        } else if (tempnum.length > 0 && isvar(func[i])) {
            d(1, func[i], 'Assign number to variable');
            variables[func[i]] = parseInt(tempnum);
            tempnum = '';
        } else if (tempstr.length > 0 && isvar(func[i])) {
            d(1, func[i], 'Assign string to variable ');
            variables[func[i]] = tempstr.replace(/\\n/g, '\n');
            tempstr = '';
        } else if (func[i] == 'b') {
            d(1, func[i], 'Break');
            break;
        } else if (isvar(func[i]) && isvar(prev)) {
            d(1, func[i], 'Copy variable to another');
            d(2, ' ', 'Copy ' + prev + ' to ' + func[i]);
            variables[func[i]] = variables[prev];
        } else if (isvar(func[i]) && tempop != null) {
            if (tempop == '-') {
                d(2, func[i], 'Prefix operate - decrement');
                variables[func[i]]--;
            } else if (tempop == '+') {
                d(2, func[i], 'Prefix operate - increment');
                variables[func[i]]++;
            } else if (tempop == 'k') {
            	variables[func[i]] = parseInt(prompt(variables['Z']));
            	delete variables['Z'];
            }
            tempop = null;
        } else if (func[i] == 'i') {
            var variable = func[i+1];
            var condition = func[i+2];
            var value = func[i+3];
            var operator = func[i+4];
            i += 4;
            if (operator != 'b') {
                var fwd = i;
                for (fwd = i; fwd < func.length; fwd++) {
                    if (func[fwd] == '.') break;
                }
                operator = func.substring(i, fwd);
                i = fwd;
            }
            if (condition == '=' && variables[variable] == value && operator == 'b') {
                d(1, func[i], 'Condition equals - break');
                break;
            } else if (condition == '=' && variables[variable] == value && operator != 'b') {
                d(1, func[i], 'Condition equals - execute');
                execute(operator, functions, variables, out);
            } else if (condition == '!' && variables[variable] != value && operator != 'b') {
                d(1, func[i], 'Condition equals - execute');
                execute(operator, functions, variables, out);
            }
        } else if (isnum(func[i])) {
            d(2, func[i], 'Append digit to number');
            tempnum += func[i];
        } else if ((tempstr.length > 0 || tempnum.length > 0 || isvar(prev)) && isop(func[i])) {
            // Prepare value
            var value = null;
            if (tempstr.length > 0) {
                value = tempstr.replace(/\\n/g, '\n');
                tempstr = '';
            } else if (tempnum.length > 0) {
                value = parseInt(tempnum);
                tempnum = '';
            } else if (isvar(prev)) {
                value = variables[prev];
            } else {
                d(0, func[i], 'Invalid value preparation');
            }
            // Operate on value
            if (func[i] == 'w') {
                d(1, func[i], 'Suffix operate - write value');
                out.innerText += value;
            } else if (func[i] == '+' || func[i] == '-') {
                d(1, func[i], 'Suffix operate - inc/decrement value');
                var operator = func[i];
                var value = variables[func[i+1]];
                if (func[i] == '+') variables[prev] += value;
                else if (func[i] == '-') variables[prev] -= value;
                i += 1;
            } else if (func[i] == 'j') {
                d(1, func[i], 'Suffix operate - js eval value');
                variables[variable] = eval(value);
                i += 1;
            } else if (func[i] == 'r') {
                var variable = func[i+1];
                variables[variable] = Math.round(Math.random()) % value;
                i += 1;
            } else if (func[i] == 'u') {
                d(1, func[i], 'Suffix operate - push value');
                console.log(variables[variable] instanceof String);
                var variable = func[i+1];
                if (variables[variable] && variables[variable].constructor === Array) {
                	variables[variable].push(value);
                } else if (variables[variable] && typeof variables[variable] == 'string') {
                	variables[variable] += value;
                } else {
                	variables[variable] = [value];
                }
                i += 1;
            } else if (func[i] == 'o') {
                d(1, func[i], 'Suffix operate - pop value');
                var from = func[i-1];
                var to = func[i+1];
                variables[to] = variables[from].pop();
                i += 1;
            } else if (func[i] == 'd') {
                d(1, func[i], 'Suffix operate - dequeue value');
                var from = func[i-1];
                var to = func[i+1];
                if (variables[from].length == 0) {
                	variables[to] = 0;
                } else {
	                variables[to] = variables[from][0];
                	variables[from] = variables[from].substring(1, variables[from].length);
                }
                i += 1;
            }
        } else if (isvar(func[i])) {
            d(2, func[i], 'Store variable');
            prev = func[i];
        } else if (isop(func[i])) {
            d(2, func[i], 'Store operator');
            tempop = func[i];
        } else if (func[i] != ' ' && func[i] != '\n') {
            d(0, func[i], 'Panic around: ' + func.substring(i-3, i + 3));
            panic = true;
            break;
        }
        if (!isvar(func[i]) && prev != null) prev = null;

        if (looping && i == func.length-1) {
            i = -1;
            loopcount++;
        }
        if (loopcount > 100) break;
    }
}
function isvar(code) {
    if (code == null) return false;
    return code >= 'A' && code <= 'Z';
}
function isop(code) {
    if (code == null) return false;
    return (code >= 'a' && code <= 'y') || code == '-' || code == '+';
}
function isnum(code ) {
    if (code == null) return false;
    return code >= '0' && code <= '9';
}