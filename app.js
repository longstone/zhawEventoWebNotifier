var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require("fs");
var app = express();
var request = require('request');
var cheerio = require('cheerio');
require('dotenv').load();
var notifier = require('./notifier');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

['ENV_USR', 'ENV_PW','TEXT_MAGIC_KEY','TEXT_MAGIC_USR','PHONE'].forEach(function (propName) {
    if (!process.env.hasOwnProperty(propName)) {
        console.error('no ' + propName);
        return
    }
    
});

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
var j = request.jar();
var request = request.defaults({jar: j});
/**
 * some base headers, with the possibility to add a user defined key/value pair
 * @param key
 * @param value
 * @returns {{followAllRedirects: boolean, jar: boolean, jar: boolean, headers: {User-Agent: string}}}
 */
var requestOptions = function requestOptionsF(key, value) {
    var options = {
        followAllRedirects: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:18.0) Gecko/20100101 Firefox/18.0'
        },
        encoding: 'binary'
    };
    if (typeof key !== 'undefined') {
        options[key] = value;
    }
    return options;
};
request.get(baseUrl, requestOptions(), function (err, response, body) {
    if (err) {
        failed(err);
        return;
    }
    // Get the response body (JSON parsed - JSON response or jQuery object in case of XML response)
    var $ = cheerio.load(response.body);
    var loginUrl = 'https://eventoweb.zhaw.ch/cst_pages/login.aspx';
    request.get(loginUrl, requestOptions(), function (err, response, body) {
        if (err) {
            failed(err);
            return;
        }
        //console.log('posting to url: ' + loginUrl); // login.aspx
        var $ = cheerio.load(response.body);
        var parameters = {}
        $(':input').each(function (index, itm) {
            parameters[itm.attribs.name] = itm.attribs.value;
        });
        parameters['ctl00$WebPartManager1$gwpLogin1$Login1$LoginMask$UserName'] = process.env.ENV_USR;
        parameters['ctl00$WebPartManager1$gwpLogin1$Login1$LoginMask$Password'] = process.env.ENV_PW;
        request.post('https://eventoweb.zhaw.ch/cst_pages/login.aspx',
            requestOptions('form', parameters)
            , function (err, response, body) {
                if (err) {
                    failed(err);
                    return;
                }
                // Get the response body
                //console.log(response.statusCode);
                var $ = cheerio.load(response.body);

                //console.log('GET ' + getGradesUrl);
                request.get(baseUrl + $('#ctl00_WebPartManager1_gwpTreeNavigation1_TreeNavigation1_oTreeViewt10').attr('href'), requestOptions(), function (err, response, body) {
                    if (err) {
                        failed(err);
                        return;
                    }
                    //console.log(response.statusCode);
                    if (body.indexOf('gesperrt') > -1) {
                        console.log('hurrra!');
                    }
                    var $ = cheerio.load(response.body);
                    var grades = [];
                    var cleanedElemenents = [];
                    $('#ctl00_WebPartManager1_gwpCst_StudentNoten1_Cst_StudentNoten1_gridview tr').each(function (index, elem) {
                            if (index < 1) {
                                return; // headrow

                            }
                            $(elem).find('td').each(function (index, elem) {

                                var txt = '';
                                if ('&#xA0;' !== $(elem).html()) {
                                    txt = $(elem).html();
                                }
                                if ($(txt).length > 0) {
// need to textify
                                    txt = $(elem).text();
                                } else {
                                    txt = txt.length > 0 ? txt : 'gesperrt';
                                }
//console.log(txt);
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
                        var spacesToAdd = 30 - length;
                        if (spacesToAdd < 0) {
                            return;
                        }
                        function addSpacesCount(spacesToAdd) {
                            if (spacesToAdd > 0) {
                                return " " + addSpacesCount(spacesToAdd - 1);
                            }
                            return "";
                        }

                        return addSpacesCount(spacesToAdd);
                    }

                    var sent = require("./sent.json");
                    var whopwhop = '';

                    grades.filter(function(elem){return elem.semester === new Date().getFullYear() + '.'+ (new Date().getMonth() > 9 || new Date().getMonth() < 3 ? 'HS' : 'FS' )}).forEach(function (elem) {
                        var course = elem.kurs.replace('w.BA.XX.', '').replace('w.MA.XX.', '');
                        course = course + addSpaces(course.length);
                        var line = course + ' : ' + elem.grade;
                        if (elem.grade !== 'gesperrt') {
                            if (elem.kurs in sent) {
                                console.log('not sending ' + course)
                            } else {
                                sent[elem.kurs] = elem.grade;
                                whopwhop += line + '\n';
                            }


                        }else{
                            console.log('still blocked: ',course);
                        }


                        //    console.log(line);

                    });
                    if (whopwhop === '') {
                        console.log('no telegram send');
                    } else {
                        fs.writeFile("sent.json", JSON.stringify(sent), "utf8", function (err) {
                            if (err) {
                                console.log('file save error');
                                return console.log(err);
                            }

                            console.log("The file was saved!");
                        });
                        
                        notifier.send(process.env.TEXT_MAGIC_KEY,process.env.TEXT_MAGIC_USR, process.env.PHONE, whopwhop)
                            .then(function (success) {
                                console.log(success)
                            }, function (error) {
                                console.log(error)
                            });

                    }
                });
            });
    });
});

