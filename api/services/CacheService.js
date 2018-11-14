"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const NodeCache = require("node-cache");
const moment_es6_1 = require("moment-es6");
var Services;
(function (Services) {
    class Cache extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'get',
                'set'
            ];
        }
        bootstrap() {
            const cacheOpts = { stdTTL: sails.config.custom_cache.cacheExpiry, checkperiod: sails.config.custom_cache.checkPeriod ? sails.config.custom_cache.checkPeriod : 600 };
            sails.log.verbose(`Using node cache options: `);
            sails.log.verbose(cacheOpts);
            this.cache = new NodeCache(cacheOpts);
        }
        get(name) {
            const cacheGet = Rx_1.Observable.bindNodeCallback(this.cache.get)(name);
            return cacheGet.flatMap(data => {
                if (data) {
                    return Rx_1.Observable.of(data);
                }
                else {
                    sails.log.verbose(`Getting DB cache entry for name: ${name}`);
                    return super.getObservable(CacheEntry.findOne({ name: name })).flatMap(dbData => {
                        if (!_.isEmpty(dbData)) {
                            sails.log.verbose(`Got DB cache entry`);
                            if (moment_es6_1.default().unix() - dbData.ts_added > sails.config.custom_cache.cacheExpiry) {
                                sails.log.verbose(`Cache entry for ${name} has expired while on the DB, returning null...`);
                                return Rx_1.Observable.of(null);
                            }
                            else {
                                this.cache.set(name, dbData.data);
                                return Rx_1.Observable.of(dbData.data);
                            }
                        }
                        sails.log.verbose(`No DB cache entry for: ${name}`);
                        return Rx_1.Observable.of(null);
                    });
                }
            });
        }
        set(name, data, expiry = sails.config.custom_cache.cacheExpiry) {
            sails.log.verbose(`Setting cache for entry: ${name}...`);
            this.cache.set(name, data, expiry);
            super.getObservable(CacheEntry.findOne({ name: name }))
                .flatMap(dbData => {
                if (!_.isEmpty(dbData)) {
                    sails.log.verbose(`Updating entry name: ${name}`);
                    return super.getObservable(CacheEntry.update({ name: name }, { name: name, data: data, ts_added: moment_es6_1.default().unix() }));
                }
                else {
                    sails.log.verbose(`Creating entry name: ${name}`);
                    return super.getObservable(CacheEntry.create({ name: name, data: data, ts_added: moment_es6_1.default().unix() }));
                }
            })
                .flatMap(dbData => {
                return Rx_1.Observable.of(dbData);
            })
                .subscribe(data => {
                sails.log.verbose(`Saved local and remote cache for entry:${name}`);
            }, error => {
                sails.log.error(`Error updating cache for entry ${name}:`);
                sails.log.error(error);
            });
        }
    }
    Services.Cache = Cache;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Cache().exports();
