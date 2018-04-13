#!/bin/env node
/*
 MIT https://github.com/duzun/gccs/blob/master/LICENSE
 @version  1.2.0
*/
(function(utf8, dash) {
  var http = require("http");
  var https = require("https");
  var fs = require("fs");
  var path = require("path");
  var querystring = require("querystring");
  if (!module.parent) {
    var opt = {};
    var argv = process.argv;
    var i = 2;
    var a;
    while ((a = argv[i]) && a.slice(0, 2) == "--") {
      ++i;
      if (a === "--") {
        break;
      }
      a = a.slice(2);
      switch(a) {
        case "help":
          usage(process.stdout);
          process.exit(0);
          break;
        default:
          {
            opt[a] = try_parse(argv[i++]);
          }
      }
    }
    var in_file = argv[i] || opt.in_file;
    var out_file = argv[i + 1] || opt.out_file;
    if (!in_file || in_file === dash) {
      in_file = dash;
      if (!out_file) {
        out_file = dash;
      }
    } else {
      if (!out_file) {
        out_file = path.join(path.dirname(in_file), path.basename(in_file, ".js") + ".min.js");
      }
    }
    opt.out_file = out_file;
    delete opt.in_file;
    compileFile(in_file, opt, function(err) {
      if (err) {
        console.error(err);
        usage(process.stderr);
        process.exit(2);
      }
      if (out_file != dash) {
        console.log("\u001b[32m%s\u001b[0m", out_file);
      }
    });
  } else {
    compile.file = compileFile;
    compile.cli_usage = usage;
    module.exports = compile;
  }
  function compile(js_code, cb) {
    var opt = {};
    if (js_code && typeof js_code == "object" && !isStream(js_code)) {
      opt = js_code;
      js_code = opt.js_code;
    }
    if (isStream(js_code)) {
      return stream2buffer(js_code, function(err, js_code) {
        if (err) {
          return cb(err);
        }
        opt.js_code = js_code;
        compile(opt, cb);
      });
    }
    if (Buffer.isBuffer(js_code)) {
      js_code = js_code.toString(utf8);
    }
    opt.js_code = js_code;
    var options = Object.assign({warning_level:"QUIET", compilation_level:"SIMPLE_OPTIMIZATIONS"}, opt, {output_info:"compiled_code", output_format:"text"});
    var port = 443;
    var mod = https;
    if ("https" in options) {
      if (!options.https) {
        port = 80;
        mod = http;
      }
      delete options.https;
    }
    var data = querystring.stringify(options);
    var req = mod.request({hostname:"closure-compiler.appspot.com", port:port, path:"/compile", method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded", "Content-Length":Buffer.byteLength(data)}}, function(res) {
      stream2buffer(res, function(err, buf) {
        cb(err, buf && buf.toString(utf8), res);
      });
    });
    req.on("error", cb);
    req.write(data);
    req.end();
    return req;
  }
  function compileFile(filename, opt, cb) {
    if (!cb && typeof opt == "function") {
      cb = opt;
      opt = undefined;
    }
    var in_file = filename !== dash ? isStream(filename) ? filename : fs.createReadStream(filename) : process.stdin;
    var out_file;
    if (opt) {
      if (typeof opt == "string" || isStream(opt)) {
        out_file = opt;
        opt = undefined;
      } else {
        if (opt.out_file) {
          out_file = opt.out_file;
          delete opt.out_file;
        }
      }
      if (out_file) {
        if (out_file === dash) {
          out_file = process.stdout;
        }
      }
    }
    return compile(Object.assign({}, opt, {js_code:in_file}), function(err, code) {
      if (err) {
        return cb(err);
      }
      if (out_file) {
        if (!isStream(out_file)) {
          out_file = fs.createWriteStream(out_file);
        }
        out_file.write(code, utf8, function(err) {
          cb(err, code);
        });
        if (!out_file._isStdio) {
          out_file.end();
        }
      } else {
        cb(err, code);
      }
    });
  }
  function isStream(stream) {
    return stream !== null && typeof stream === "object" && typeof stream.pipe === "function";
  }
  function stream2buffer(stream, cb) {
    var buf = [];
    stream.on("data", function(chunk) {
      buf.push(chunk);
    });
    stream.on("end", function() {
      cb(null, buf = Buffer.concat(buf), stream);
    });
    stream.on("error", cb);
    return stream;
  }
  function try_parse(str) {
    if (typeof str == "string") {
      try {
        return JSON.parse(str);
      } catch (err) {
      }
    }
    return str;
  }
  function usage(stream) {
    var gccs = path.basename(process.argv[1], ".js");
    var txt = "Usage:\n    " + gccs + ' [ <in_file> [ <out_file> ] ]\n\n    If <out_file> is omitted, out_file = in_file.min.js\n    If <in_file> == "-", stdin is used (<out_file> defaults to "-").\n    If <out_file> == "-", stdout is used.\n    If <in_file> and <out_file> are both omitted, they both default to "-".\n';
    if (stream) {
      stream.write(txt);
    } else {
      return txt;
    }
  }
})("utf8", "-");

