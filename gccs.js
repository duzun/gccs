#!/bin/env node

/**
 * Compile JS files using Google's Closure-Compiler service
 *
 * @author  Dumitru Uzun (https://DUzun.Me)
 * @license MIT https://github.com/duzun/gccs/blob/master/LICENSE
 * @version  1.1.0
 */

/*jshint node: true*/

(function (utf8, dash) {

var http        = require('http');
var https       = require('https');
var fs          = require('fs');
var path        = require('path');
var querystring = require('querystring');

// CLI
if ( !module.parent ) {
    var in_file = process.argv[2];
    var out_file = process.argv[3];

    if ( in_file === '--help' ) {
        usage(process.stdout);
        process.exit(0);
    }

    if ( !in_file || in_file === dash ) {
        in_file = dash;
        if ( !out_file ) {
            out_file = dash;
        }
    }
    else if ( !out_file ) {
        out_file = path.join(path.dirname(in_file), path.basename(in_file, '.js') + '.min.js');
    }

    compileFile(in_file, out_file, function (err) {
        if (err) {
            console.error(err);
            usage(process.stderr);
            process.exit(2);
        }
        if ( out_file != dash ) {
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

function compile(js_code, cb) {
    var opt = {};
    if ( js_code && typeof js_code == 'object' && !isStream(js_code) ) {
        opt = js_code;
        js_code = opt.js_code;
    }

    if ( isStream(js_code) ) {
        return stream2buffer(js_code, function (err, js_code) {
            if ( err ) return cb(err);
            opt.js_code = js_code;
            compile(opt, cb);
        });
    }

    if ( Buffer.isBuffer(js_code) ) {
        js_code = js_code.toString(utf8);
    }

    opt.js_code = js_code;

    var options = Object.assign({
        output_info: 'compiled_code'
      , output_format: 'text'
      , compilation_level: 'SIMPLE_OPTIMIZATIONS'
      , warning_level: 'QUIET'
    }, opt);

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
      stream2buffer(res, function (err, buf) { cb(err, buf && buf.toString(utf8), res); });
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
    var in_file = filename !== dash
        ? isStream(filename)
            ? filename
            : fs.createReadStream(filename)
        : process.stdin
    ;
    var out_file;

    if ( opt ) {
        if ( typeof opt == 'string' || isStream(opt) ) {
            out_file = opt;
            opt = undefined;
        }
        else if ( opt.out_file ) {
            out_file = opt.out_file;
            delete opt.out_file;
        }

        if ( out_file ) {
            if ( out_file === dash ) {
                out_file = process.stdout;
            }
        }
    }

    return compile(Object.assign({}, opt, { js_code: in_file }), function (err, code) {
        if ( err ) return cb(err);
        if ( out_file ) {
            if ( !isStream(out_file) ) {
                // var dir = path.dirname(out_file);
                // if ( !fs.existsSync(dir) ) {
                //     fs.mkdir(dir);
                // }
                out_file = fs.createWriteStream(out_file);
            }
            out_file.write(code, utf8, function (err) {
                cb(err, code);
            });
            if ( !out_file._isStdio ) {
                out_file.end();
            }
        }
        else {
            cb(err, code);
        }
    });
}

function isStream(stream) {
    return stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function';
}

function stream2buffer(stream, cb) {
    var buf = [];
    stream.on('data', function (chunk) { buf.push(chunk); });
    stream.on('end', function () { cb(null, buf = Buffer.concat(buf), stream); });
    stream.on('error', cb);
    return stream;
}

function usage(stream) {
    var gccs = path.basename(process.argv[1], '.js');
    var txt =

'Usage:\n' +
'    ' + gccs + ' [ <in_file> [ <out_file> ] ]\n' +
'\n' +
'    If <out_file> is omitted, out_file = in_file.min.js\n' +
'    If <in_file> == "-", stdin is used (<out_file> defaults to "-").\n' +
'    If <out_file> == "-", stdout is used.\n' +
'    If <in_file> and <out_file> are both omitted, they both default to "-".\n' +
'';

    if ( stream ) {
        stream.write(txt);
    }
    else {
        return txt;
    }
}

}('utf8', '-'));
