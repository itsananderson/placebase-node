var fs = require('fs'),
    http = require('http'),
    _ = require('lodash'),
    q = require('q');

var DefaultGetSizesOptions = {
    paramFlags : ['-d', '--directory'],
    nonParamFlags : ['-g', '--grayscale']
};

var DefaultDownloadOptions = {
    urlBase: 'http://placekitten.com/',
    directory: '.',
    prefix: ''
};

function getSizes(args, options) {
    var i, curArg,
        sizes = [];

    options = _.extend(DefaultGetSizesOptions, options || {});

    for (i = 2; i < args.length; i++) {
        curArg = args[i];
        if (curArg != '') {
            if (_.contains(options.paramFlags, curArg)) {
                // Skip this arg and the next when a param flag is encountered
                i++;
            } else if (_.contains(options.nonParamFlags, curArg)) {
                // Skip this arg if a non-param flag is encountered
            } else {
                sizes.push(curArg);
            }
        }
    }
    return sizes;
}

function downloadAll(sizes, options) {
    var i, size;
    for (i = 0; i < sizes.length; i++ ) {
        size = sizes[i];
        console.log('Downloading ' + size);
        download(size, options).then(
            function(path) {
                console.log('  Done. ' + path);
            }, function(error) {
                console.log(error);
            }
        );
    }
}

function download(size, options) {
    options = _.extend(DefaultDownloadOptions, options || {});

    var deferred = q.defer();

    if (size === undefined || size === '') {
        deferred.reject('Error: size not specified');
        return deferred.promise;
    }

    if ('\\' !== options.directory[options.directory.length-1]
        && '/' !== options.directory[options.directory.length-1]) {
        options.directory += '/';
    }

    if (-1 === size.indexOf('/') && -1 == size.indexOf('x')) {
        size += '/' + size;
    }
    var fileName = size.replace('/', 'x') + '.jpg';
    var filePath = options.directory + fileName;

    fs.exists(options.directory, function(exists) {
        if (!exists) {
            deferred.reject('Error: directory ' + options.directory + ' does not exist');
            return deferred.promise;
        }

        var file = fs.createWriteStream(filePath);

        var responseHandler = function(response) {
            if (response.headers.location) {
                // Attach an empty listener so stream will finish
                response.on('data', function() {});

                http.get(response.headers.location, responseHandler);
            } else {
                response.pipe(file);
                file.on('finish', function () {
                    file.close(function () {
                        deferred.resolve(filePath);
                    });
                });
            }
        };

        http.get(options.urlBase + options.prefix + size, responseHandler);
    });

    return deferred.promise;
};

module.exports = {
    getSizes: getSizes,
    downloadAll: downloadAll,
    download: download
};