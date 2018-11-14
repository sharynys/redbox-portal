"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class WorkspaceTypes extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'create',
                'get',
                'getOne'
            ];
            this.bootstrap = (defBrand) => {
                return super.getObservable(WorkspaceType.destroy({ branding: defBrand.id })).flatMap(whatever => {
                    sails.log.debug('WorkspaceTypes::Bootstrap');
                    sails.log.debug(sails.config.workspacetype);
                    let workspaceTypes = [];
                    if (!_.isEmpty(sails.config.workspacetype)) {
                        var wTypes = [];
                        sails.log.verbose("Bootstrapping workspace type definitions... ");
                        _.forOwn(sails.config.workspacetype, (config, workspaceType) => {
                            workspaceTypes.push(workspaceType);
                            var obs = this.create(defBrand, config);
                            wTypes.push(obs);
                        });
                        return Rx_1.Observable.zip(...wTypes);
                    }
                    else {
                        sails.log.verbose("Default or no workspaceTypes definition(s).");
                        return Rx_1.Observable.of([]);
                    }
                });
            };
        }
        create(brand, workspaceType) {
            return super.getObservable(WorkspaceType.create({
                name: workspaceType['name'],
                label: workspaceType['label'],
                branding: brand.id,
                subtitle: workspaceType['subtitle'],
                description: workspaceType['description'],
                logo: workspaceType['logo']
            }));
        }
        get(brand) {
            return super.getObservable(WorkspaceType.find({ branding: brand.id }));
        }
        getOne(brand, name) {
            return super.getObservable(WorkspaceType.findOne({ branding: brand.id, name: name }));
        }
    }
    Services.WorkspaceTypes = WorkspaceTypes;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.WorkspaceTypes().exports();
