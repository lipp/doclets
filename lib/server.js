var path = require('path');
var spawn = require('child_process').spawn;
var request = require('request');
var githubHandler = require('github-webhook-handler')({
    path: '/github/callback',
    secret: 'abc'
});
var config = require('./config');
var express = require('express');
var fs = require('fs');
var app = express();

app.use(express.static('static'));
app.use(githubHandler);


var server = app.listen(3420, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log('Maja listening at http://%s:%s', host, port);
});


var test = function(pr, testLogStream, done) {
    return function() {
        var makeArgs = [];
        try {
            if (pr !== undefined) {
                makeArgs = [
                    pr.user.login,
                    pr.head.ref,
                    pr.head.repo.ssh_url
                ];
            }

            var child = spawn('./make.sh', makeArgs);

            child.stdout.pipe(testLogStream);
            child.stderr.pipe(process.stderr);

            child.on('close', function(code) {
                var err;
                if (code !== 0) {
                    err = 'mocha tests failed';
                    console.error('make.sh error, exited with', code);
                }
                done(err);
            });
        } catch (err) {
            console.error('could not run make.sh', err);
            done(err);
        }
    };
};

var testQueue = [];

// listen on pull requests
githubHandler.on('pull_request', function(event) {
    var data = event.payload;

    if (data.action === 'opened' || data.action === 'synchronize') {

        var pr = data.pull_request;
        var dir = './static/' + pr.id;
        try {
            fs.mkdirSync(dir);
        } catch (e) {
            console.log(dir, 'already exists');
        }
        var logFileName = path.join(dir, 'log.txt');
        var testLogStream = fs.createWriteStream(logFileName, {
            flags: 'w'
        });
        // set status to pending
        var testLogUrl = event.protocol + '://' + event.host + '/' + pr.id + '/log.txt';
        pending(pr.statuses_url, testLogUrl);

        testQueue.push(test(pr, testLogStream, function(err) {
            if (err) {
                error(pr.statuses_url, testLogUrl);
            } else {
                success(pr.statuses_url, testLogUrl);
            }
            testQueue.shift();
            if (testQueue.length > 0) {
                testQueue[0]();
            }
        }));

        if (testQueue.length === 1) {
            testQueue[0]();
        }
    }

});

// source: https://img.shields.io/badge/color-brightgreen-brightgreen.svg
var shieldGreen = ' \
  <svg xmlns="http://www.w3.org/2000/svg" width="114" height="20"> \
    <linearGradient id="b" x2="0" y2="100%"> \
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/> \
      <stop offset="1" stop-opacity=".1"/> \
    </linearGradient> \
    <mask id="a"> \
      <rect width="114" height="20" rx="3" fill="#fff"/> \
    </mask> \
    <g mask="url(#a)"> \
      <path fill="#555" d="M0 0h38v20H0z"/> \
      <path fill="#4c1" d="M38 0h76v20H38z"/> \
      <path fill="url(#b)" d="M0 0h114v20H0z"/> \
    </g> \
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11"> \
      <text x="19" y="15" fill="#010101" fill-opacity=".3">maja</text> \
      <text x="19" y="14">maja</text> \
      <text x="75" y="15" fill="#010101" fill-opacity=".3">passing</text> \
      <text x="75" y="14">passing</text> \
    </g> \
  </svg>';

var shieldRed = ' \
  <svg xmlns="http://www.w3.org/2000/svg" width="67" height="20"> \
    <linearGradient id="b" x2="0" y2="100%"> \
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/> \
      <stop offset="1" stop-opacity=".1"/> \
    </linearGradient> \
    <mask id="a"> \
      <rect width="67" height="20" rx="3" fill="#fff"/> \
    </mask> \
    <g mask="url(#a)"> \
      <path fill="#555" d="M0 0h38v20H0z"/> \
      <path fill="#e05d44" d="M38 0h29v20H38z"/> \
      <path fill="url(#b)" d="M0 0h67v20H0z"/> \
    </g> \
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11"> \
      <text x="19" y="15" fill="#010101" fill-opacity=".3">maja</text> \
      <text x="19" y="14">maja</text> \
      <text x="51.5" y="15" fill="#010101" fill-opacity=".3">failing</text> \
      <text x="51.5" y="14">failing</text> \
    </g> \
  </svg>';


// listen on pull requests
githubHandler.on('push', function() {

    var dir = './static/master';
    try {
        fs.mkdirSync(dir);
    } catch (e) {
        console.log(dir, 'already exists');
    }
    var logFileName = path.join(dir, 'log.txt');
    var testLogStream = fs.createWriteStream(logFileName, {
        flags: 'w'
    });
    fs.writeFileSync(dir + '/status.txt', 'pending');

    testQueue.push(test(undefined, testLogStream, function(err) {
        if (err) {
            console.log('master is not ok', err);
            fs.writeFileSync(dir + '/status.svg', shieldRed);
        } else {
            console.log('master is ok');
            fs.writeFileSync(dir + '/status.svg', shieldGreen);
        }
        testQueue.shift();
        if (testQueue.length > 0) {
            testQueue[0]();
        }
    }));

    if (testQueue.length === 1) {
        testQueue[0]();
    }

});
/**
 * Send response to statuses api
 */
function response(url, state, description, statusUrl) {
    console.log('sending: ' + state);
    request({
        url: url + '?access_token=' + config.token,
        headers: {
            'User-Agent': 'HBM-Team'
        },
        method: 'POST',
        json: {
            state: state,
            target_url: statusUrl,
            description: description,
            context: 'ci/maja'
        }
    }, function(err, res, body) {
        if (err) {
            console.log(err);
        }
        if (res.statusCode !== 201) {
            console.log(res);
            console.log(body);
        }
    });
}

function success(url, statusUrl) {
    return response(url, 'success', 'I\'m done', statusUrl);
}

function pending(url, statusUrl) {
    return response(url, 'pending', 'I\'ll start working right away', statusUrl);
}

function error(url, statusUrl) {
    return response(url, 'error', 'I could not finish the job', statusUrl);
}

// function failure(url, statusUrl) {
//     return response(url, 'failure', 'I could not finish the job', statusUrl);
// }
