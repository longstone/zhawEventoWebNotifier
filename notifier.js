var TMClient = require('textmagic-rest-client');

var stripMobile = function stripMobileF(phoneNumber) {
    if (phoneNumber.indexOf('+') === 0 ||
        phoneNumber.indexOf('0') === 0) {
        return stripMobile(phoneNumber.substr(1, phoneNumber.length))
    }
    return phoneNumber;
};

var sendPromise = function (key, user, phone, msg) {
    return new Promise(function (resolve, reject) {

        var c = new TMClient(user, key);
        c.Messages.send({text: msg, phones: stripMobile(phone)}, function (err, res) {
            console.log('Messages.send()', err, res);
        });

    });
};

module.exports = {send: sendPromise};