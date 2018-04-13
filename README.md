
# gccs == google-closure-compliler-service

Vanila Node.js script to compile JS code using 
Google's [Closure Compiler Service](https://closure-compiler.appspot.com/home) (zero dependencies).

## Install 

You can install `gccs` either as a global CLI script or per project.

```sh
# global
npm -g i gccs

# in project
npm i gccs
```


## Usage

### CLI

```sh

# Compile input.js and save output as input.min.js
gccs input.js

# Compile input.js to output.min.js
gccs input.js output.min.js

# Output compiled JS to console (stdout)
gccs input.js -

# Pipe
cat input.js | gccs
cat input.js | gccs - output.min.js

# Compile a node.js CLI script (with shebang)
(echo '#!/bin/env node' && gccs my-cli.js -) > my-cli && chmod +x my-cli

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

// Compile a JS file and output to console (stdout)
gccs.file('input.js', '-', function (error, minjs) {})
// or
gccs.file('input.js', process.stdout, function (error, minjs) {})


// Compile a JS file (stream in)
var _in = fs.createReadStream('input.js');
gccs(_in, function (error, minjs) {
    if ( error ) return console.error(error);
    console.log(minjs); // minified contents of 'input.js'
});

// Compile a JS file and save output to another file (stream in and out)
var _in = fs.createReadStream('input.js');
var _out = fs.createWriteStream('output.min.js');
gccs.file(_in, _out, function (error) {})

```
