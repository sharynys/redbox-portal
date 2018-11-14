"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const UrlPattern = require("url-pattern");
var Services;
(function (Services) {
    class PathRules extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'getRulesFromPath',
                'canRead',
                'canWrite'
            ];
            this.bootstrap = (defUser, defRoles) => {
                sails.log.verbose("Bootstrapping path rules....");
                var defBrand = BrandingService.getDefault();
                return this.loadRules()
                    .flatMap(rules => {
                    if (!rules || rules.length == 0) {
                        sails.log.verbose("Rules, don't exist, seeding...");
                        var seedRules = sails.config.auth.rules;
                        _.forEach(seedRules, (rule) => {
                            var role = RolesService.getRoleWithName(defRoles, rule.role);
                            rule.role = role.id;
                            rule.branding = defBrand.id;
                        });
                        return Rx_1.Observable.from(seedRules)
                            .flatMap(rule => {
                            return super.getObservable(PathRule.create(rule));
                        })
                            .last()
                            .flatMap(rule => {
                            return this.loadRules();
                        })
                            .flatMap(rules => {
                            return Rx_1.Observable.of(rules);
                        });
                    }
                    else {
                        sails.log.verbose("Rules exists.");
                        return Rx_1.Observable.of(rules);
                    }
                });
            };
            this.loadRules = () => {
                return super.getObservable(PathRule.find({}).populate('role').populate('branding'))
                    .flatMap(rules => {
                    this.pathRules = rules;
                    this.rulePatterns = [];
                    _.forEach(rules, (rule) => {
                        this.rulePatterns.push({ pattern: new UrlPattern(rule.path), rule: rule });
                    });
                    return Rx_1.Observable.of(this.pathRules);
                });
            };
            this.getRulesFromPath = (path, brand) => {
                var matchedRulePatterns = _.filter(this.rulePatterns, (rulePattern) => {
                    var pattern = rulePattern.pattern;
                    return pattern.match(path) && rulePattern.rule.branding.id == brand.id;
                });
                if (matchedRulePatterns && matchedRulePatterns.length > 0) {
                    return _.map(matchedRulePatterns, 'rule');
                }
                else {
                    return null;
                }
            };
            this.canRead = (rules, roles, brandName) => {
                var matchRule = _.filter(rules, (rule) => {
                    var userRole = _.find(roles, (role) => {
                        return role.id == rule.role.id && rule.branding.name == brandName;
                    });
                    return userRole != undefined && (rule.can_read == true || rule.can_update == true);
                });
                return matchRule.length > 0;
            };
            this.canWrite = (rules, roles, brandName) => {
                return _.filter(rules, (rule) => {
                    var userRole = _.find(roles, (role) => {
                        return role.id == rule.role.id && rule.branding.name == brandName;
                    });
                    return userRole != undefined && (rule.can_update == true);
                }).length > 0;
            };
        }
    }
    Services.PathRules = PathRules;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.PathRules().exports();
