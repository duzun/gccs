
# gccs == google-closure-compliler-service [![Build Status](https://travis-ci.org/duzun/gccs.svg?branch=master)](https://travis-ci.org/duzun/gccs)

Vanilla Node.js script to compile JS code using 
Google's [Closure Compiler Service](https://closure-compiler.appspot.com/home) (zero dependencies).

## Install 

You can install `gccs` either as a global CLI script or per project.

```sh
# global
npm i -g gccs

# in project
npm i gccs
```


## Usage

Actually, there is no real need to install it if you have `npx` (default with `npm@5.2.0` and up).
Just call it with `npx gccs input.js`

### CLI

```sh
# Compile input.js and save output as input.min.js
gccs input.js

# Compile input.js to output.min.js
gccs input.js output.min.js

# Output compiled JS to console (stdout)
gccs input.js -

# With options. When https == false, it might be faster. Other options go to GCC service
gccs --https false --compilation_level WHITESPACE_ONLY --formatting pretty_print -- input.es6.js output.es5.js

# Pipe
cat input.js | gccs
cat input.js | gccs - output.min.js

# Compile a node.js CLI script (gccs preserves shebang of my-cli.js)
gccs my-cli.js my-cli && chmod +x my-cli

# Compile a node.js CLI script and add shebang
# Note: Use this when my-cli.js doesn't already contain the shebang
(echo '#!/usr/bin/env node' && gccs my-cli.js -) > my-cli && chmod +x my-cli
```

#### package.json

For a small JS/ES6 library `gccs` could be sufficient as a build script.
Here is an example of `build` command for `package.json`
of [verup](https://github.com/duzun/verup) library:

```js
...
"scripts": {
  "es5": "gccs --compilation_level WHITESPACE_ONLY --formatting pretty_print -- verup.js dist/verup.js",
  "min": "gccs dist/verup.js dist/verup.min.js",
  "build": "npm run es5 && npm run min"
  ...
}
...
```

This build command would produce the ES5 version of `verup.js` at `dist/verup.js`
and the minified ES5 version at `dist/verup.min.js`.
Isn't that cool? :-)


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
