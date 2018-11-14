"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class Config extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'getBrand'
            ];
        }
        getBrand(brandName, configBlock) {
            let configVal = sails.config[configBlock][brandName];
            if (_.isUndefined(configVal)) {
                brandName = sails.config.auth.defaultBrand;
                configVal = sails.config[configBlock][brandName];
            }
            return configVal;
        }
    }
    Services.Config = Config;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Config().exports();
