#!/bin/env node

/**
 *   Compile JS files using Closure-Compiler service
 */

/*jshint node: true*/

var http        = require('http');
var https       = require('https');
var fs          = require('fs');
var path        = require('path');
var querystring = require('querystring');

// CLI
if ( !module.parent ) {
    var in_file = process.argv[2];
    var out_file = process.argv[3];

    if ( !in_file ) {
        process.stderr.write('Missing input filename');
        usage(process.stderr);
        process.exit(1);
    }

    if ( !out_file ) {
        out_file = path.join(path.dirname(in_file), path.basename(in_file, '.js') + '.min.js');
    }

    compileFile(in_file, out_file, function (err) {
        if (err) {
            console.error(err);
            process.exit(2);
        }
        if ( out_file != '-' ) {
            console.log("\x1b[32m%s\x1b[0m", out_file);
        }
    });
}
// module
else {
    compile.file = compileFile;
    compile.cli_usage = usage;

    module.exports = compile;
}

function compile(script, cb) {
    var options = Object.assign({
        output_info: 'compiled_code'
      , output_format: 'text'
      , compilation_level: 'SIMPLE_OPTIMIZATIONS'
      , warning_level: 'QUIET'
      , js_code: script
    }, typeof script == 'object' ? script : {});

    var port = 443;
    var mod = https;

    if ( options.https === false ) {
        port = 80;
        mod = http;
    }

    delete options.https;

    var data = querystring.stringify(options);

    var req = mod.request({
      hostname: 'closure-compiler.appspot.com'
      , port: port
      , path: '/compile'
      , method: 'POST'
      , headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data)
      }
    }, function(res) {
      // console.log('STATUS: ' + res.statusCode);
      var buf = [];
      res.on('data', function (chunk) { buf.push(chunk); });
      res.on('end', function () { cb(null, buf = Buffer.concat(buf).toString('utf8'), res); });
    });

    req.on('error', cb);

    req.write(data);
    req.end();

    return req;
}

function compileFile(filename, opt, cb) {
    if ( !cb && typeof opt == 'function' ) {
        cb = opt;
        opt = undefined;
    }
    var out_file;
    if ( opt ) {
        if ( typeof opt == 'string' ) {
            out_file = opt;
            opt = undefined;
        }
        else if ( opt.out_file ) {
            out_file = opt.out_file;
            delete opt.out_file;
        }
    }

    return fs.readFile(
      filename
      , 'utf8'
      , function (err, js_code) {
            err
            ? cb(err)
            : compile(Object.assign({}, opt, {js_code: js_code}), function (err, code) {
                if ( err ) return cb(err);
                if ( out_file ) {
                    if ( out_file == '-' ) {
                        process.stdout.write(code);
                        cb(null, code);
                    }
                    else {
                        // var dir = path.dirname(out_file);
                        // if ( !fs.existsSync(dir) ) {
                        //     fs.mkdir(dir);
                        // }
                        fs.writeFile(out_file, code, 'utf8', cb);
                    }
                }
                else {
                    cb(err, code);
                }
            });
        }
    );
}

function usage(stream) {
    var txt = `Usage: ${path.basename(process.argv[1])} <in_file> [<out_file> | -]
    If <out_file> is ommited, out_file = in_file.min.js
`;
    if ( stream ) {
        stream.write(txt);
    }
    else {
        return txt;
    }
}
