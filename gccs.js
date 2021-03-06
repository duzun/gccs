#!/usr/bin/env node

/**
 * Compile JS files using Google's Closure-Compiler service
 *
 * @author  Dumitru Uzun (https://DUzun.Me)
 * @license MIT https://github.com/duzun/gccs/blob/master/LICENSE
 * @version  1.3.2
 */

((utf8, dash, process) => {
'use strict';

const VERSION = '1.3.2';

const http        = require('http');
const https       = require('https');
const fs          = require('fs');
const path        = require('path');
const querystring = require('querystring');

compile.VERSION = VERSION;

// CLI
if ( !module.parent ) {
    const opt = {};
    const argv = process.argv;
    let i = 2;
    let a;
    while( (a=argv[i]) && a.slice(0,2) == '--' ) {
        ++i;
        if ( a === '--' ) break;
        a = a.slice(2);
        switch(a) {
            case 'help':
                usage(process.stdout);
                process.exit(0);
            break;

            default: {
                opt[a] = try_parse(argv[i++]);
            }
        }
    }
    let in_file = argv[i] || opt.in_file;
    let out_file = argv[i+1] || opt.out_file;

    if ( !in_file || in_file === dash ) {
        in_file = dash;
        if ( !out_file ) {
            out_file = dash;
        }
    }
    else if ( !out_file ) {
        out_file = path.join(path.dirname(in_file), path.basename(in_file, '.js') + '.min.js');
    }

    opt.out_file = out_file;
    delete opt.in_file;

    compileFile(in_file, opt, (err) => {
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
    let opt = {};
    if ( isObject(js_code) && !isStream(js_code) ) {
        opt = js_code;
        js_code = opt.js_code;
    }

    if ( isStream(js_code) ) {
        return stream2buffer(js_code, (err, js_code) => {
            if ( err ) return cb(err);
            opt.js_code = js_code;
            compile(opt, cb);
        });
    }

    if ( Buffer.isBuffer(js_code) ) {
        js_code = js_code.toString(utf8);
    }

    let shebang = js_code.match(/^#!.{3,}/);

    opt.js_code = js_code;

    const options = Object.assign({
        warning_level: 'QUIET'
      , compilation_level: 'SIMPLE_OPTIMIZATIONS'
    }, opt, {
        output_info: 'compiled_code'
      , output_format: 'text'
    });

    const { mod, port } = 'https' in options && !options.https
        ? { mod: http, port: 80 }
        : { mod: https, port: 443 }
    ;

    delete options.https;

    const data = querystring.stringify(options);

    const req = mod.request({
      hostname: 'closure-compiler.appspot.com',
      port: port,
      path: '/compile',
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
        // console.log('STATUS: ' + res.statusCode);
        stream2buffer(res, (err, buf) => {
            if ( buf ) buf = buf.toString(utf8);
            if ( shebang ) buf = shebang[0] + '\n' + buf;
            cb(err, buf, res);
            // cb(err, (shebang ? shebang[0] + '\n' : '') + (buf ? buf.toString(utf8) : ''), res);
        });
    });

    req.on('error', cb);
    req.write(data);
    req.end();

    return req;
}

function compileFile(filename, opt, cb) {
    if ( !cb && isFunction(opt) ) {
        cb = opt;
        opt = undefined;
    }
    let in_file = filename !== dash
        ? isStream(filename)
            ? filename
            : fs.createReadStream(filename)
        : process.stdin
    ;
    let out_file;

    if ( opt ) {
        if ( isString(opt) || isStream(opt) ) {
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

    return compile(Object.assign({}, opt, { js_code: in_file }), (err, code) => {
        if ( err ) return cb(err);
        if ( out_file ) {
            if ( !isStream(out_file) ) {
                // let dir = path.dirname(out_file);
                // if ( !fs.existsSync(dir) ) {
                //     fs.mkdir(dir);
                // }
                out_file = fs.createWriteStream(out_file);
            }
            out_file.write(code, utf8, (err) => {
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

function usage(stream) {
    const gccs = path.basename(process.argv[1], '.js');
    const txt =

`Usage:
    ${gccs} --help
        or
    ${gccs} [OPTIONS] [--] [ <in_file> [ <out_file> ] ]

    If <out_file> is omitted, out_file = in_file.min.js
    If <in_file> == "-", stdin is used (<out_file> defaults to "-").
    If <out_file> == "-", stdout is used.
    If <in_file> and <out_file> are both omitted, they both default to "-".

    OPTIONS:
        --https              true | false
        --compilation_level  WHITESPACE_ONLY | SIMPLE_OPTIMIZATIONS | ADVANCED_OPTIMIZATIONS
        --formatting         pretty_print,print_input_delimiter
        ...   (anything that Closure Compiler service accepts)
`;

    if ( stream ) {
        stream.write(txt);
    }
    else {
        return txt;
    }
}

    // ---  Helpers ---

    function stream2buffer(stream, cb) {
        let buf = [];
        stream.on('data', (chunk) => { buf.push(chunk); });
        stream.on('end', () => { cb(null, buf = Buffer.concat(buf), stream); });
        stream.on('error', cb);
        return stream;
    }

    function try_parse(str) {
        if ( isString(str) ) try {
            return JSON.parse(str);
        }
        catch(err) {}
        return str;
    }

    function isString(val) {
        return typeof val === 'string';
    }

    function isFunction(val) {
        return typeof val === 'function';
    }

    function isObject(val) {
        return val && typeof val === 'object';
    }

    function isStream(stream) {
        return isObject(stream) && isFunction(stream.pipe);
    }

})('utf8', '-', process);
