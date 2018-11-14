"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class Roles extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'getRole',
                'getAdmin',
                'getRoleIds',
                'getRolesWithBrand',
                'getAdminFromRoles',
                'getRoleWithName',
                'getRoleByName',
                'getDefAuthenticatedRole',
                'getDefUnathenticatedRole',
                'getNestedRoles'
            ];
            this.getRoleWithName = (roles, roleName) => {
                return _.find(roles, (o) => { return o.name == roleName; });
            };
            this.getRole = (brand, roleName) => {
                return this.getRoleWithName(brand.roles, roleName);
            };
            this.getRoleByName = (brand, roleName) => {
                return this.getRoleWithName(brand.roles, this.getConfigRole(roleName).name);
            };
            this.getAdmin = (brand) => {
                return this.getRole(brand, this.getConfigRole('Admin').name);
            };
            this.getAdminFromRoles = (roles) => {
                return this.getRoleWithName(roles, this.getConfigRole('Admin').name);
            };
            this.getDefAuthenticatedRole = (brand) => {
                sails.log.verbose(this.getRoleWithName(brand.roles, this.getConfigRole(ConfigService.getBrand(brand.name, 'auth').aaf.defaultRole).name));
                return this.getRoleWithName(brand.roles, this.getConfigRole(ConfigService.getBrand(brand.name, 'auth').aaf.defaultRole).name);
            };
            this.getNestedRoles = (role, brandRoles) => {
                var roles = [];
                switch (role) {
                    case "Admin":
                        roles.push(this.getRoleWithName(brandRoles, 'Admin'));
                    case "Maintainer":
                        roles.push(this.getRoleWithName(brandRoles, 'Maintainer'));
                    case "Researcher":
                        roles.push(this.getRoleWithName(brandRoles, 'Researcher'));
                    case "Guest":
                        roles.push(this.getRoleWithName(brandRoles, 'Guest'));
                        break;
                }
                return roles;
            };
            this.getDefUnathenticatedRole = (brand) => {
                return this.getRoleWithName(brand.roles, this.getConfigRole(ConfigService.getBrand(brand.name, 'auth').defaultRole).name);
            };
            this.getRolesWithBrand = (brand) => {
                return super.getObservable(Role.find({ branding: brand.id }).populate('users'));
            };
            this.getRoleIds = (fromRoles, roleNames) => {
                sails.log.verbose("Getting id of role names...");
                return _.map(_.filter(fromRoles, (role) => { return _.includes(roleNames, role.name); }), 'id');
            };
            this.bootstrap = (defBrand) => {
                var adminRole = this.getAdmin(defBrand);
                if (adminRole == null) {
                    sails.log.verbose("Creating default admin, and other roles...");
                    return Rx_1.Observable.from(this.getConfigRoles())
                        .flatMap(roleConfig => {
                        return super.getObservable(Role.create(roleConfig))
                            .flatMap(newRole => {
                            sails.log.verbose("Adding role to brand:" + newRole.id);
                            var brand = sails.services.brandingservice.getDefault();
                            const q = BrandingConfig.addToCollection(brand.id, 'roles').members([newRole.id]);
                            return super.getObservable(q, 'exec', 'simplecb');
                        });
                    })
                        .last()
                        .flatMap(brand => {
                        return sails.services.brandingservice.loadAvailableBrands();
                    });
                }
                else {
                    sails.log.verbose("Admin role exists.");
                    return Rx_1.Observable.of(defBrand);
                }
            };
            this.getConfigRole = (roleName) => {
                return _.find(sails.config.auth.roles, (o) => { return o.name == roleName; });
            };
            this.getConfigRoles = (roleProp = null, customObj = null) => {
                var retVal = sails.config.auth.roles;
                if (roleProp) {
                    retVal = [];
                    _.map(sails.config.auth.roles, (o) => {
                        var newObj = {};
                        newObj[roleProp] = o;
                        if (customObj) {
                            newObj['custom'] = customObj;
                        }
                        retVal.push(newObj);
                    });
                }
                sails.log.verbose(retVal);
                return retVal;
            };
        }
    }
    Services.Roles = Roles;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Roles().exports();
