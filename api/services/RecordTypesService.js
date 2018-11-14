"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class RecordTypes extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'create',
                'get',
                'getAll',
                'getAllCache'
            ];
            this.bootstrap = (defBrand) => {
                let startQ = RecordType.find({ branding: defBrand.id });
                if (sails.config.appmode.bootstrapAlways) {
                    startQ = RecordType.destroy({ branding: defBrand.id });
                }
                return super.getObservable(startQ).flatMap(recordTypes => {
                    if (_.isUndefined(recordTypes)) {
                        recordTypes = [];
                    }
                    sails.log.debug(`RecordTypes found: ${recordTypes} and boostrapAlways set to: ${sails.config.appmode.bootstrapAlways}`);
                    if (_.isEmpty(recordTypes)) {
                        var rTypes = [];
                        sails.log.verbose("Bootstrapping record type definitions... ");
                        _.forOwn(sails.config.recordtype, (config, recordType) => {
                            recordTypes.push(recordType);
                            var obs = this.create(defBrand, recordType, config);
                            rTypes.push(obs);
                        });
                        this.recordTypes = recordTypes;
                        return Rx_1.Observable.zip(...rTypes);
                    }
                    else {
                        sails.log.verbose("Default recordTypes definition(s) exist.");
                        sails.log.verbose(JSON.stringify(recordTypes));
                        this.recordTypes = recordTypes;
                        return Rx_1.Observable.of(recordTypes);
                    }
                });
            };
        }
        create(brand, name, config) {
            return super.getObservable(RecordType.create({
                name: name,
                branding: brand.id,
                packageType: config.packageType,
                searchFilters: config.searchFilters,
                hooks: config.hooks,
                transferResponsibility: config.transferResponsibility,
                relatedTo: config.relatedTo
            }));
        }
        get(brand, name, fields = null) {
            const criteria = { where: { branding: brand.id, name: name } };
            if (fields) {
                criteria.select = fields;
            }
            return super.getObservable(RecordType.findOne(criteria));
        }
        getAll(brand, fields = null) {
            const criteria = { where: { branding: brand.id } };
            if (fields) {
                criteria.select = fields;
            }
            return super.getObservable(RecordType.find(criteria));
        }
        getAllCache() {
            return this.recordTypes;
        }
    }
    Services.RecordTypes = RecordTypes;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.RecordTypes().exports();
