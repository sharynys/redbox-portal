"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const redbox2ckan_1 = require("redbox2ckan");
var Services;
(function (Services) {
    class CKAN extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'publishToCKAN'
            ];
        }
        publishToCKAN(params, options) {
            const oid = params["oid"];
            let redboxToCkan = new redbox2ckan_1.RedboxToCkan.RedboxToCkan(sails.config.redboxToCkan);
            var obs = RecordsService.getMeta(oid);
            return obs.map(record => {
                record.redboxOid = oid;
                return Rx_1.Observable.fromPromise(redboxToCkan.createAllRedboxDatasets([record]));
            });
        }
    }
    Services.CKAN = CKAN;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.CKAN().exports();
