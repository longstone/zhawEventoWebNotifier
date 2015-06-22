var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var request = require('request');
var cheerio = require('cheerio');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
var baseUrl = 'https://eventoweb.zhaw.ch/';
var failed = function (err) {
    console.log(err);
};
var request = request.defaults({jar: true});
var j = request.jar()
request.get(baseUrl, {
    followAllRedirects: true, jar: true, jar: j,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:18.0) Gecko/20100101 Firefox/18.0'
    }
}, function (err, response, body) {
    if (err) {
        failed(err);
        return;
    }
    var cookies = response.cookies;
    // Get the response body (JSON parsed - JSON response or jQuery object in case of XML response)
    var $ = cheerio.load(response.body);
    var loginUrl = 'https://eventoweb.zhaw.ch/cst_pages/login.aspx';
    request.get(loginUrl, {
        followAllRedirects: true, jar: true, jar: j,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:18.0) Gecko/20100101 Firefox/18.0'
        }
    }, function (err, response, body) {
        if (err) {
            failed(err);
            return;
        }
        cookies = response.cookies;
        var loginUrl = baseUrl + 'cst_pages/login.aspx';
        //console.log('posting to url: ' + loginUrl); // login.aspx
        var $ = cheerio.load(response.body);
        var parameters = {}
        $(':input').each(function (index, itm) {
            parameters[itm.attribs.name] = itm.attribs.value;
        });
        parameters['ctl00$WebPartManager1$gwpLogin1$Login1$LoginMask$UserName'] = process.env.ENV_USR;
        parameters['ctl00$WebPartManager1$gwpLogin1$Login1$LoginMask$Password'] = process.env.ENV_PW;
        request.post(baseUrl + 'cst_pages/login.aspx', {
            followAllRedirects: true, jar: true, form: parameters, jar: j, headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:18.0) Gecko/20100101 Firefox/18.0'
            }
        }, function (err, response, body) {
            if (err) {
                failed(err);
                return;
            }
            // Get the response body
            //console.log(response.statusCode);
            var cookies = response.cookies;
            var $ = cheerio.load(response.body);
            var getGradesUrl = baseUrl + cheerio.load(response.body)('#ctl00_WebPartManager1_gwpTreeNavigation1_TreeNavigation1_oTreeViewt10').attr('href');
            //console.log('GET ' + getGradesUrl);
            request.get(getGradesUrl, {
                    followAllRedirects: true, jar: true, jar: j, headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:18.0) Gecko/20100101 Firefox/18.0'
                    }
                }, function (err, response, body) {
                    if (err) {
                        failed(err);
                        return;
                    }
                    //console.log(response.statusCode);
                    //if (body.indexOf('gesperrt') > -1) {
                    //    console.log('hurrra!');
                    //}
                    var $ = cheerio.load(response.body);
                    var grades = [];
                    var cleanedElemenents = [];
                    $('#ctl00_WebPartManager1_gwpCst_StudentNoten1_Cst_StudentNoten1_gridview tr').each(function (index, elem) {
                            if (index < 1) {
                                return; // headrow

                            }
                            $(elem).find('td').each(function (index, elem) {
                                var txt = $(elem).html()
                                if ($(txt).length > 0) {
// need to textify
                                    txt = $(elem).text();
                                }
                                cleanedElemenents.push(txt);
                            });

                        }
                    );
                    var tempObj;
                    for (var i = 0; i <= cleanedElemenents.length; i++) {
                        if (i % 4 === 0) {
                            tempObj = {semester: cleanedElemenents[i]};
                        } else if (i % 4 === 1) {
                            tempObj['kurs'] = cleanedElemenents[i];
                        } else if (i % 4 === 3) {
                            tempObj['grade'] = cleanedElemenents[i]
                            grades.push(tempObj);
                        }

                    }
                    function addSpaces(length) {
                        var spacesToAdd = 10-length;
                        if(spacesToAdd < 0){return;}
                        function addSpacesCount(spacesToAdd) {
                            if(spacesToAdd>0){
                                return " " + addSpacesCount(spacesToAdd-1);
                            }
                            return "";
                        }

                        return addSpacesCount(spacesToAdd);
                    }

                    grades.forEach(function(elem){
                        var course = elem.kurs.substr('w.BA.XX.'.length).replace('.XX.GK','');
                        course = course + addSpaces(course.length);

                        console.log(course +' : '+ elem.grade);
                    });
                }
            )
            ;
        });
    });

});