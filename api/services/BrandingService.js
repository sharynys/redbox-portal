"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class Branding extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'loadAvailableBrands',
                'getDefault',
                'getBrand',
                'getAvailable',
                'getBrandAndPortalPath',
                'getBrandFromReq',
                'getPortalFromReq',
                'getFullPath'
            ];
            this.availableBrandings = [];
            this.brandings = [];
            this.dBrand = { name: 'default' };
            this.bootstrap = () => {
                return super.getObservable(BrandingConfig.findOne(this.dBrand))
                    .flatMap(defaultBrand => {
                    if (_.isEmpty(defaultBrand)) {
                        sails.log.verbose("Default brand doesn't exist, creating...");
                        return super.getObservable(BrandingConfig.create(this.dBrand));
                    }
                    sails.log.verbose("Default brand already exists...");
                    return Rx_1.Observable.of(defaultBrand);
                })
                    .flatMap(this.loadAvailableBrands);
            };
            this.loadAvailableBrands = (defBrand) => {
                sails.log.verbose("Loading available brands......");
                return super.getObservable(BrandingConfig.find({}).populate('roles'))
                    .flatMap(brands => {
                    this.brandings = brands;
                    this.availableBrandings = _.map(this.brandings, 'name');
                    var defBrandEntry = this.getDefault();
                    if (defBrandEntry == null) {
                        sails.log.error("Failed to load default brand!");
                        return Rx_1.Observable.throw(new Error("Failed to load default brand!"));
                    }
                    return Rx_1.Observable.of(defBrandEntry);
                });
            };
            this.getDefault = () => {
                return _.find(this.brandings, (o) => { return o.name == this.dBrand.name; });
            };
            this.getBrand = (name) => {
                return _.find(this.brandings, (o) => { return o.name == name; });
            };
            this.getAvailable = () => {
                return this.availableBrandings;
            };
        }
        getBrandAndPortalPath(req) {
            const branding = this.getBrandFromReq(req);
            const portal = this.getPortalFromReq(req);
            const path = `/${branding}/${portal}`;
            return path;
        }
        getFullPath(req) {
            return sails.config.appUrl + this.getBrandAndPortalPath(req);
        }
        getBrandFromReq(req) {
            var branding = req.params['branding'];
            if (branding == null) {
                if (req.body != null) {
                    branding = req.body.branding;
                }
            }
            if (branding == null) {
                if (req.session != null) {
                    branding = req.session.branding;
                }
            }
            if (branding == null) {
                branding = sails.config.auth.defaultBrand;
            }
            return branding;
        }
        getPortalFromReq(req) {
            var portal = req.params['portal'];
            if (portal == null) {
                if (req.body != null) {
                    portal = req.body.portal;
                }
            }
            if (portal == null) {
                if (req.session != null) {
                    portal = req.session.portal;
                }
            }
            if (portal == null) {
                portal = sails.config.auth.defaultPortal;
            }
            return portal;
        }
    }
    Services.Branding = Branding;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Branding().exports();
