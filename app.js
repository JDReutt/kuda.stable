#!/usr/bin/env node
/*
 * Simple web server to serve the Kuda World Editor. It provides asset
 * management, project management, editor plugin management, and publishing.
 *
 * Add new routes to the var routes as a constant and use the convenience
 * functions for get, post, put, and del for the http verbs.
 *
 * NOTES: Asset importing is currently disabled. Windows does not have tar or
 * zip support out of the box. Currently investigating solutions.
 *
 * Requirements:
 *      node.exe (Windows native)
 *      node (OS X, Linux)
 */
var qs = require('querystring'),
    http = require('http'),
    fs = require('fs'),
    path = require('path'),
    JSONt = 'application/json',
    HTMLt = 'text/html',
    PLAINt = 'text/plain',
    opt_quiet = false,
    opt_repl = false, 
    opt_ws = false;
    routes = {
        ROOT: '/',
        ROOTANY: '/*',
        PROJECTS: '/projects',
        PROJECT: '/project',
        MODELS: '/models',
        PLUGINS: '/plugins',
        PUBLISH: '/publish',
        LIGHTING_WS: 'websocket-lighting',
        rootPath: 'public',
        pluginsPath: 'public/js/editor/plugins',
        projectsPath: 'public/projects',
        assetsPath: 'public/assets',
        //uploadPath: 'public/tmp',
        ws: function(protocol, handler) {
            log('...adding WebSocket handler for protocol ' + protocol);
            this.wss[protocol] = handler;
        },
        wss: {},
        wsConnections: [],
        get: function(route, handler) {
            log('...adding GET handler for route ' + route);
            this.gets[route] = handler;
        },
        gets: {},
        post: function(route, handler) {
            log('...adding POST handler for route ' + route);
            this.posts[route] = handler;
        },
        posts: {},
        put: function(route, handler) {
            log('...adding PUT handler for route ' + route);
            this.puts[route] = handler;
        },
        puts: {},
        del: function(route, handler) {
            log('...adding DELETE handler for route ' + route);
            this.dels[route] = handler;
        },
        dels: {},
        dispatch: function(req, res) {
            var url = req.reqPath;

            switch (req.method) {
            case "GET":
                if (this.gets[url]) {
                    this.gets[url](req, res);
                } else {
                    this.gets['/*'](req, res);
                }
                break;
            case "POST":
                if (this.posts[url]) {
                    this.posts[url](req, res);
                } else {
                    log('unknown POST route ' + url);
                }break;
            case "PUT":
                if (this.puts[url]) {
                    this.puts[url](req, res);
                } else {
                    log('unknown PUT route ' + url);
                }
                break;
            case "DELETE":
                if (this.dels[url]) {
                    this.dels[url](req, res);
                } else {
                    log('unknown DELETE route ' + url);
                }
                break;
            default:
                log('unknown request method ' + req.method);
            }
        }
    },
    log = function(msg) {
        if (!opt_quiet) {
            console.log(msg);
        }
    };

if (process.argv.length > 2) {
    var ndx = 2;

    // Check for flags
    while (process.argv[ndx] && process.argv[ndx].charAt(0) === '-') {
        var flag = process.argv[ndx++];

        switch (flag) {
        case '-q':
            opt_quiet = true;
            break;
        case '-i':
            opt_repl = true;
            break;
        case '-ws':
            opt_ws = true;
            break;
        default:
            console.log('Usage: ' + process.argv[0] + ' ' + path.basename(process.argv[1]) + ' [OPTIONS]');
            console.log(' -q quiet, no logging to the console');
            console.log(' -i interactive, start with a node repl console');
            console.log(' -ws WebSocket, enables WebSockets');
            console.log(' -h help, show the usage');
            process.exit(0);
        }
    }
}

routes.get(routes.ROOT, function(req, res) {
    log('...handling route GET ' + routes.ROOT);
    var data = fs.readFileSync(routes.rootPath + '/index.html');
    res.send(data, 200, HTMLt);
});

routes.get(routes.ROOTANY, function(req, res) {
    log('...handling route GET ' + routes.ROOTANY + ' for ' + req.reqPath);

    var status = 404,
        data = 'The requested URL ' + req.reqPath + ' was not found on this server';

    if (path.existsSync(routes.rootPath + req.reqPath)) {
        status = 200;
        data = fs.readFileSync(routes.rootPath + req.reqPath);
    }

    res.send(data, status, req.contentType);
});

routes.get(routes.PROJECTS, function(req, res) {
    log('...handling route GET ' + routes.PROJECTS);

    if (req.xhr) {
        var data = {
            projects: []
        };

        if (!path.existsSync(routes.projectsPath)) {
            fs.mkdirSync(routes.projectsPath, 0755);
        } else {
            var files = fs.readdirSync(routes.projectsPath);

            for (var i = 0, il = files.length; i < il; i++) {               
                var file = files[i];
                
                if (file.match('.json')) {
                    file = file.split('.')[0];
                    
                    var published = routes.projectsPath + '/' + file + '.html',
                        pData = {
                            name: file,
                            published: path.existsSync(published)
                        };
                    
                    data.projects.push(pData);  
                }
            }
        }

        res.send(JSON.stringify(data), 200, JSONt);
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.get(routes.PROJECT, function(req, res) {
    log('...handling route GET ' + routes.PROJECT);

    if (req.xhr) {
        var name = req.param['name'] + '.json',
            filePath = routes.projectsPath + '/' + name;

        if (path.existsSync(filePath)) {
            var data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            res.send(JSON.stringify(data), 200, JSONt);
        } else {
            res.send('', 404, PLAINt);
        }
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.post(routes.PROJECT, function(req, res) {
    log('...handling route POST ' + routes.PROJECT);

    if (req.xhr) {
        if (!path.existsSync(routes.projectsPath)) {
            fs.mkdirSync(routes.projectsPath, 0755);
        }

        var defName = 'project',
            param = req.param,
            name = (param['name'] || defName) + '.json',
            replace = param['replace'] == 'true',
            filePath = routes.projectsPath + '/' + name;

        if (path.existsSync(filePath) && !replace) {
            var oldData = {
                name: param['name'],
                octane: param['octane']
            };

            res.send(JSON.stringify({
                errType: 'fileExists',
                errData: oldData,
                errMsg: 'File by that name already exists'
            }), 400, JSONt);
        } else {
            var input = param['octane'];

            fs.writeFileSync(filePath, input);
            res.send(JSON.stringify({
                name: name
            }), 200, JSONt);
        }
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.del(routes.PROJECT, function(req, res) {
    log('...handling route DELETE ' + routes.PROJECT);

    if (req.xhr) {
        var name = req.param['name'],
            filePath = routes.projectsPath + '/' + name + '.json';

        if (path.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.send(JSON.stringify({
                name: name,
                msg: 'Successfully removed ' + name
            }), 200, JSONt);
        } else {
            res.send('', 404, JSONt);
        }
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.get(routes.MODELS, function(req, res) {
    log('...handling route GET ' + routes.MODELS);

    var data = {
        models: []
    };
    
    if (!path.existsSync(routes.assetsPath)) {
        fs.mkdirSync(routes.assetsPath, 0755);
    } else {
        var files = fs.readdirSync(routes.assetsPath),
            urlDir = 'assets/';
        
        for (var i = 0, il = files.length; i < il; i++) {               
            var file = files[i],
                dir = routes.assetsPath + '/' + file,
                mDir = urlDir + file,
                stat = fs.statSync(dir);
            
            if (stat.isDirectory()) {
                var mFiles = fs.readdirSync(dir),
                    mData = {
                        name: file
                    },
                    found = false;
                
                for (var j = 0, jl = mFiles.length; j < jl && !found; j++) {
                    var mFile = mFiles[j];
                    
                    if (mFile.match('.json')) {
                        mData.url = mDir + '/' + mFile;
                        found = true;
                    }
                }
                
                if (found) {
                    data.models.push(mData);
                }
            }
        }
    }

    res.send(JSON.stringify(data), 200, JSONt);
});

// TODO: Support model import without using tar, use zip and unzip?
routes.post('/model', function(req, res) {
    log('...handling route post /model');

    if (req.xhr && req.headers['content-type'] == 'application/octet-stream') {
        // if (!path.existsSync(uploadPath)) {
        //  fs.mkdirSync(uploadPath, 0755);
        // }

        // var fName = req.header('x-file-name'), 
        //  fSize = req.header('x-file-size'), 
        //  fType = req.header('x-file-type'), 
        //  tmpFile = uploadPath + '/' + fName,
        //  toDir = assetsPath + '/' + fName.split('.').shift(),
        //  origDir = toDir,
        //  ws = fs.createWriteStream(tmpFile),
        //  ext = fName.split('.').pop(),
        //  counter = 0;
            
        // req.on('data', function(data){
        //  ws.write(data);
        // });
        
        // if (ext === 'o3dtgz' || ext === 'tgz' || ext === 'zip') {
            
        //  while (path.existsSync(toDir)) {
        //      toDir = origDir + counter++;
        //  }
        //  fs.mkdirSync(toDir, 0755);
            
        //  var tarChild = child.spawn('tar', ['-C', toDir, '-xzf', tmpFile], {
        //      customFds: procFds
        //  });
            
        //  tarChild.on('exit', function(code){
        //      if (code === 0) {
        //          // Clean up the temp file
        //          fs.unlinkSync(tmpFile);
                    
        //          var mFiles = fs.readdirSync(toDir), 
        //              found = false, 
        //              retVal = {}, 
        //              urlDir = toDir.split('/');
                    
        //          urlDir.shift();
                    
        //          for (var j = 0, jl = mFiles.length; j < jl && !found; j++) {
        //              var mFile = mFiles[j];
                        
        //              if (mFile.match('.json')) {
        //                  retVal.name = urlDir[urlDir.length - 1];
        //                  retVal.url = urlDir.join('/') + '/' + mFile;
        //                  found = true;
        //              }
        //          }
                    
        //          res.send(retVal, 200);
        //      }
        //      else {
        //          res.send('Failed to upload file', 300);
        //          fs.unlinkSync(tmpFile);
        //      }
        //  });
        // } else {         
        //  res.send('File must be an archive file', 300);
        //  fs.unlinkSync(tmpFile);
        // }

        res.send('{}\n', 200, JSONt);
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.get(routes.PLUGINS, function(req, res) {
    log('...handling route GET ' + routes.PLUGINS);

    if (req.xhr) {
        var data = {
            plugins: []
        };
        
        if (path.existsSync(routes.pluginsPath)) {
            var files = fs.readdirSync(routes.pluginsPath);
            
            for (var i = 0, il = files.length; i < il; i++) {               
                var file = files[i],    
                    dir = routes.pluginsPath + '/' + file,
                    stat = fs.statSync(dir);
                
                if (stat.isDirectory()) {
                    var pFiles = fs.readdirSync(dir),
                        found = false;
                    
                    for (var j = 0, jl = pFiles.length; j < jl && !found; j++) {
                        var pFile = pFiles[j];
                        
                        if (pFile.match(file)) {
                            found = true;
                        }
                    }
                    
                    if (found) {
                        data.plugins.push(file);
                    }
                }
            }
        }
        
        res.send(JSON.stringify(data), 200, JSONt);
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.post(routes.PLUGINS, function(req, res) {
    log('...handling route POST ' + routes.PLUGINS);

    if (req.xhr) {      
        if (!path.existsSync(routes.pluginsPath)) {
            fs.mkdirSync(routes.pluginsPath, 0755);
        }
        
        var plugins = req.param['plugins'] || { 'plugins': [] },
            filePath = routes.pluginsPath + '/plugins.json';

        fs.writeFileSync(filePath, plugins);
        res.send(JSON.stringify({
            msg: 'Initial plugins updated'
        }), 200, JSONt);
    } else {
        res.send('{}\n', 200, JSONt);
    }
});

routes.post(routes.PUBLISH, function(req, res) {
    log('...handling route POST ' + routes.PUBLISH);

    if (req.xhr) {
        var name = req.param['name'],
            models = req.param['models'],
            filePath = routes.projectsPath + '/' + name + '.html',
            content = fs.readFileSync('PublishTemplate.html', 'utf8'),
            readme = fs.readFileSync('PublishReadMe', 'utf8'),
            start = content.indexOf('<!DOCTYPE');

        content = content.substr(start);
        fs.writeFileSync(filePath,
            content.replace(/%PROJECT%/g, 'projects/' + name)
                .replace(/%LOAD%/g, '..').replace(/%SCRIPT%/g, '../js'));
        
        // Create the published package directory
        var toDir = routes.projectsPath + '/' + name;
        var stat = fs.statSync(routes.projectsPath);
        fs.mkdirSync(toDir, stat.mode);
        fs.mkdirSync(toDir + '/assets', stat.mode);
        fs.mkdirSync(toDir + '/lib', stat.mode);
        copyFile('./public/js/hemi.min.js', toDir);
        copyFile('./public/js/o3d.min.js', toDir);
        copyFile('./public/js/lib/jshashtable.min.js', toDir + '/lib');
        copyFile(routes.projectsPath + '/' + name + '.json', toDir);
        fs.writeFileSync(toDir + '/README', readme.concat(models));
        fs.writeFileSync(toDir + '/' + name + '.html',
            content.replace(/%PROJECT%/g, name).replace(/%LOAD%/g, '.')
                .replace(/%SCRIPT%/g, '.'));
        res.send(JSON.stringify({
            name: name + '.html'
        }), 200, HTMLt);
    }
});

routes.ws(routes.LIGHTING_WS, function(connection) {
    log('...handling route WebSocket ' + routes.LIGHTING_WS);
    var maps = { 0800: {
            kitchen: './public/assets/images/TimeMaps/Kitchen_0800.jpg',
            walls: './public/assets/images/TimeMaps/Walls_0800.jpg',
            logs: './public/assets/images/TimeMaps/Logs_0800.jpg',
            ceiling: './public/assets/images/TimeMaps/Ceiling_0800.jpg',
            ba: './public/assets/images/TimeMaps/BA_0800.jpg',
            b1: './public/assets/images/TimeMaps/B1_0800.jpg',
            b2: './public/assets/images/TimeMaps/B2_0800.jpg',
            floor: './public/assets/images/TimeMaps/Floor_0800.jpg',
            window_south: './public/assets/images/TimeMaps/Window_South_0800.jpg',
            window_lr3: './public/assets/images/TimeMaps/Window_LR3_0800.jpg',
            window_b2: './public/assets/images/TimeMaps/Window_B2_0800.jpg',
            window_b1: './public/assets/images/TimeMaps/Window_B1_0800.jpg',
            window_ki: './public/assets/images/TimeMaps/Window_KI_0800.jpg',
            window_lr4: './public/assets/images/TimeMaps/Window_LR4_0800.jpg'
            }, 1000: {
            kitchen: './public/assets/images/TimeMaps/Kitchen_1000.jpg',
            walls: './public/assets/images/TimeMaps/Walls_1000.jpg',
            logs: './public/assets/images/TimeMaps/Logs_1000.jpg',
            ceiling: './public/assets/images/TimeMaps/Ceiling_1000.jpg',
            ba: './public/assets/images/TimeMaps/BA_1000.jpg',
            b1: './public/assets/images/TimeMaps/B1_1000.jpg',
            b2: './public/assets/images/TimeMaps/B2_1000.jpg',
            floor: './public/assets/images/TimeMaps/Floor_1000.jpg',
            window_south: './public/assets/images/TimeMaps/Window_South_1000.jpg',
            window_lr3: './public/assets/images/TimeMaps/Window_LR3_1000.jpg',
            window_b2: './public/assets/images/TimeMaps/Window_B2_1000.jpg',
            window_b1: './public/assets/images/TimeMaps/Window_B1_1000.jpg',
            window_ki: './public/assets/images/TimeMaps/Window_KI_1000.jpg',
            window_lr4: './public/assets/images/TimeMaps/Window_LR4_1000.jpg'
            }, 1200: {
            kitchen: './public/assets/images/TimeMaps/Kitchen_1200.jpg',
            walls: './public/assets/images/TimeMaps/Walls_1200.jpg',
            logs: './public/assets/images/TimeMaps/Logs_1200.jpg',
            ceiling: './public/assets/images/TimeMaps/Ceiling_1200.jpg',
            ba: './public/assets/images/TimeMaps/BA_1200.jpg',
            b1: './public/assets/images/TimeMaps/B1_1200.jpg',
            b2: './public/assets/images/TimeMaps/B2_1200.jpg',
            floor: './public/assets/images/TimeMaps/Floor_1200.jpg',
            window_south: './public/assets/images/TimeMaps/Window_South_1200.jpg',
            window_lr3: './public/assets/images/TimeMaps/Window_LR3_1200.jpg',
            window_b2: './public/assets/images/TimeMaps/Window_B2_1200.jpg',
            window_b1: './public/assets/images/TimeMaps/Window_B1_1200.jpg',
            window_ki: './public/assets/images/TimeMaps/Window_KI_1200.jpg',
            window_lr4: './public/assets/images/TimeMaps/Window_LR4_1200.jpg'
            }, 1500: {
            kitchen: './public/assets/images/TimeMaps/Kitchen_1500.jpg',
            walls: './public/assets/images/TimeMaps/Walls_1500.jpg',
            logs: './public/assets/images/TimeMaps/Logs_1500.jpg',
            ceiling: './public/assets/images/TimeMaps/Ceiling_1500.jpg',
            ba: './public/assets/images/TimeMaps/BA_1500.jpg',
            b1: './public/assets/images/TimeMaps/B1_1500.jpg',
            b2: './public/assets/images/TimeMaps/B2_1500.jpg',
            floor: './public/assets/images/TimeMaps/Floor_1500.jpg',
            window_south: './public/assets/images/TimeMaps/Window_South_1500.jpg',
            window_lr3: './public/assets/images/TimeMaps/Window_LR3_1500.jpg',
            window_b2: './public/assets/images/TimeMaps/Window_B2_1500.jpg',
            window_b1: './public/assets/images/TimeMaps/Window_B1_1500.jpg',
            window_ki: './public/assets/images/TimeMaps/Window_KI_1500.jpg',
            window_lr4: './public/assets/images/TimeMaps/Window_LR4_1500.jpg'
            }, 1725: {
            kitchen: './public/assets/images/TimeMaps/Kitchen_1725.jpg',
            walls: './public/assets/images/TimeMaps/Walls_1725.jpg',
            logs: './public/assets/images/TimeMaps/Logs_1725.jpg',
            ceiling: './public/assets/images/TimeMaps/Ceiling_1725.jpg',
            ba: './public/assets/images/TimeMaps/BA_1725.jpg',
            b1: './public/assets/images/TimeMaps/B1_1725.jpg',
            b2: './public/assets/images/TimeMaps/B2_1725.jpg',
            floor: './public/assets/images/TimeMaps/Floor_1725.jpg',
            window_south: './public/assets/images/TimeMaps/Window_South_1725.jpg',
            window_lr3: './public/assets/images/TimeMaps/Window_LR3_1725.jpg',
            window_b2: './public/assets/images/TimeMaps/Window_B2_1725.jpg',
            window_b1: './public/assets/images/TimeMaps/Window_B1_1725.jpg',
            window_ki: './public/assets/images/TimeMaps/Window_KI_1725.jpg',
            window_lr4: './public/assets/images/TimeMaps/Window_LR4_1725.jpg'
            }
        };

    for (var setName in maps) {
        for (var textureName in maps[setName]) {
            var obj =  {
                    msg: 'textureImage',
                    data: {
                        setName: setName,
                        textureName: textureName,
                    }
                },
                filename = maps[setName][textureName];

            fs.readFile(filename, 'base64', (function(obj, filename) {
                var callback = function(err, data) {
                    var type = filename.slice(-3),
                        textureData;

                    if (type === 'jpg') {
                        textureData = 'data:image/jpg;base64,' + data;
                    } else if (type === 'png') {
                        textureData = 'data:image/png;base64,' + data;
                    } else {
                        log('unknown image type ' + type);
                    }
                    
                    obj.data.img = textureData;
                    var data = JSON.stringify(obj);
                    connection.sendUTF(data);                    
                };
                
                return callback;
            })(obj, filename));
        }
    }
});

function getPathLessTheQueryString(url) {
    return url.indexOf('?') === -1 ? url : url.substring(0, url.indexOf('?'));
}

function getTheQueryString(url) {
    return url.indexOf('?') === -1 ? '' : url.slice(url.indexOf('?') + 1);
}

function req2ContentType(urlLessQueryString) {
    var at = urlLessQueryString.lastIndexOf('.'),
        fileType = at === -1 ? '.txt' : urlLessQueryString.slice(at),
        contentType = PLAINt;

    switch (fileType) {
    case '.css':
        contentType = 'text/css';
        break;
    case '.js':
        contentType = 'text/javascript';
        break;
    case '.html':
        contentType = HTMLt;
        break;
    case '.htm':
        contentType = HTMLt;
        break;
    case '.txt':
        contentType = PLAINt;
        break;
    case '.json':
        contentType = JSONt;
        break;
    case '.png':
        contentType = 'image/png';
        break;
    case '.jpeg':
        contentType = 'image/jpeg';
        break;
    case '.jpg':
        contentType = 'image/jpeg';
        break;
    case '.gif':
        contentType = 'image/gif';
        break;
    case '.ico':
        contentType = 'image/x-icon';
        break;
    case '.fx':
        contentType = PLAINt;
        break;
    case '.woff':
        contentType = 'application/octet-stream';
        break;
    default:
        log('unknown content type for ' + fileType);
    }

    return contentType;
}

var copyFile = function(srcFile, dstDir) {
    var data = fs.readFileSync(srcFile),
        newFile = dstDir + '/' + path.basename(srcFile);    
    fs.writeFileSync(newFile, data);
};

var app = http.createServer(function (hreq, hres) {
    var pltqs = getPathLessTheQueryString(hreq.url),
        req = {
            url: hreq.url,
            method: hreq.method,
            headers: hreq.headers,
            body: '',
            xhr: hreq.headers['x-requested-with'] == 'XMLHttpRequest',
            reqPath: decodeURIComponent(pltqs),
            contentType: req2ContentType(pltqs),
            queryString: getTheQueryString(hreq.url),
            param: undefined,
            httpReq: hreq,
        },
        res = {
            httpRes: hres,
            send: function(data, status, contentType) {
                this.httpRes.writeHead(status, { 'Content-Type': contentType });
                this.httpRes.end(data);
            }
        };

        hreq
            .on('data', function (data) {
                req.body += data;
            })
            .on('end', function () {
                req.param = qs.parse(req.queryString == '' ? req.body : req.queryString);
                routes.dispatch(req, res);
            });
});

app.listen(3000, "127.0.0.1");

if (opt_ws) {
    var WebSocketServer = require('WebSockets/websocket').server,
        wsServer = new WebSocketServer({
            httpServer: app,
            fragmentOutgoingMessages: false
        });

    wsServer.on('request', function(request) {
        log('...handling WebSocket connection request for ' + request.requestedProtocols.toString());

        for (var i = 0; i < request.requestedProtocols.length; i++) {
            if (routes.wss[request.requestedProtocols[i]]) {
                var connection = request.accept(request.requestedProtocols[i], request.origin);

                connection.on('close', function() {
                    log('...WebSocket connection closed to ' + connection.remoteAddress);
                    var index = routes.wsConnections.indexOf(connection);

                    if (index !== -1) {
                        // remove the connection from the pool
                        routes.wsConnections.splice(index, 1);
                    }
                });

                log('...WebSocket connection accepted for ' + connection.remoteAddress);
                routes.wss[request.requestedProtocols[i]](connection);
                routes.wsConnections.push(connection);
            } else {
                log('unknown WebSocket protocol ' + request.requestedProtocols[i]);
            }       
        }
    });
}

console.log('Node ' + process.version + ' Kuda server running at http://localhost:3000/');

if (opt_repl) {
    console.log('Kuda server interactive mode');

    var repl = require('repl'),
        svr = repl.start();

    svr.defineCommand('x', {
        help: 'Exit the interactive mode and server',
        action: function(code) {
            process.exit(code || 0);
        }
    });

    // TODO: Find a better way, but for now this will do.
    svr.context.qs = qs;
    svr.context.http = http;
    svr.context.fs = fs;
    svr.context.path = path;
    svr.context.JSONt = JSONt;
    svr.context.HTMLt = HTMLt;
    svr.context.PLAINt = PLAINt;
    svr.context.routes = routes;
}
