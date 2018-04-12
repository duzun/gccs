
# gccs == google-closure-compliler-service

Vanila Node.js script to compile JS code using 
Google's [Closure Compiler Service](https://closure-compiler.appspot.com/home) (zero dependencies).

## Usage

### CLI

```sh

# Compile input.js and save output as input.min.js
node gccs.js input.js

# Compile input.js to output.min.js
node gccs.js input.js output.min.js

# Output compiled JS to console (stdout)
node gccs.js input.js -

# Compile a node.js CLI script (with shebang)
(echo '#!/bin/env node' && node gccs.js my-cli.js -) > my-cli && chmod +x my-cli

```

### Node module

```js
const gccs = require("gccs");

// Compile some JS as a string
var js_code = "var my = 'owesome'; // script";
gccs(js_code, function (error, minjs) {
    if ( error ) return console.error(error);
    console.log(minjs); // minified js_code
});

// Compile string JS with some options
gccs({js_code: js_code, compilation_level: 'WHITESPACE_ONLY'}, function (error, minjs) {
    if ( error ) return console.error(error);
    console.log(minjs); // js_code w/o whitespaces
});

// Compile a JS file
gccs.file('input.js', function (error, minjs) {
    if ( error ) return console.error(error);
    console.log(minjs); // minified contents of 'input.js'
})

// Compile a JS file and save output to another file
gccs.file('input.js', 'output.min.js', function (error) {})

// Compile a JS file and output to console (stdout)
gccs.file('input.js', '-', function (error, minjs) {})

```
