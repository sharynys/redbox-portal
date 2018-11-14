"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services = require("../core/CoreService.js");
const moment_es6_1 = require("moment-es6");
var Services;
(function (Services) {
    class Asynchs extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'start',
                'update',
                'finish',
                'get'
            ];
        }
        start(progressObj) {
            if (_.isEmpty(progressObj.date_started) || _.isUndefined(progressObj.date_completed)) {
                progressObj.date_started = moment_es6_1.default().format('YYYY-MM-DDTHH:mm:ss');
            }
            return super.getObservable(AsynchProgress.create(progressObj));
        }
        update(criteria, progressObj) {
            return super.getObservable(AsynchProgress.update(criteria, progressObj));
        }
        finish(progressId, progressObj = null) {
            if (progressObj) {
                progressObj.date_completed = moment_es6_1.default().format('YYYY-MM-DD HH:mm:ss');
            }
            else {
                progressObj = { date_completed: moment_es6_1.default().format('YYYY-MM-DD HH:mm:ss') };
            }
            progressObj.status = 'finished';
            return super.getObservable(AsynchProgress.update({ id: progressId }, progressObj));
        }
        get(criteria) {
            return super.getObservable(AsynchProgress.find(criteria));
        }
    }
    Services.Asynchs = Asynchs;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Asynchs().exports();
