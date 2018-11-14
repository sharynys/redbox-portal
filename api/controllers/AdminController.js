"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const uuidv4 = require("uuid/v4");
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Admin extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'rolesIndex',
                'usersIndex',
                'getBrandRoles',
                'getUsers',
                'updateUserRoles',
                'updateUserDetails',
                'addLocalUser',
                'generateUserKey',
                'revokeUserKey'
            ];
        }
        rolesIndex(req, res) {
            return this.sendView(req, res, 'admin/roles');
        }
        usersIndex(req, res) {
            return this.sendView(req, res, 'admin/users');
        }
        getUsers(req, res) {
            var pageData = {};
            var users = UsersService.getUsers().flatMap(users => {
                _.map(users, (user) => {
                    if (_.isEmpty(_.find(sails.config.auth.hiddenUsers, (hideUser) => { return hideUser == user.name; }))) {
                        if (_.isEmpty(pageData.users)) {
                            pageData.users = [];
                        }
                        delete user.token;
                        delete user.password;
                        pageData.users.push(user);
                    }
                });
                return Rx_1.Observable.of(pageData);
            })
                .subscribe(pageData => {
                this.ajaxOk(req, res, null, pageData.users);
            });
        }
        getBrandRoles(req, res) {
            var pageData = {};
            var brand = BrandingService.getBrand(req.session.branding);
            var roles = RolesService.getRolesWithBrand(brand).flatMap(roles => {
                _.map(roles, (role) => {
                    if (_.isEmpty(_.find(sails.config.auth.hiddenRoles, (hideRole) => { return hideRole == role.name; }))) {
                        if (_.isEmpty(pageData.roles)) {
                            pageData.roles = [];
                        }
                        pageData.roles.push(role);
                    }
                });
                return Rx_1.Observable.of(pageData);
            })
                .subscribe(pageData => {
                this.ajaxOk(req, res, null, pageData.roles);
            });
        }
        generateUserKey(req, res) {
            var userid = req.body.userid;
            if (userid) {
                var uuid = uuidv4();
                UsersService.setUserKey(userid, uuid).subscribe(user => {
                    this.ajaxOk(req, res, uuid);
                }, error => {
                    sails.log.error("Failed to set UUID:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                return this.ajaxFail(req, res, "Please provide userid");
            }
        }
        revokeUserKey(req, res) {
            var userid = req.body.userid;
            if (userid) {
                var uuid = '';
                UsersService.setUserKey(userid, uuid).subscribe(user => {
                    this.ajaxOk(req, res, "UUID revoked successfully");
                }, error => {
                    sails.log.error("Failed to revoke UUID:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                return this.ajaxFail(req, res, "Please provide userid");
            }
        }
        addLocalUser(req, res) {
            var username = req.body.username;
            var details = req.body.details;
            if (details.name) {
                var name = details.name;
            }
            ;
            if (details.password) {
                var password = details.password;
            }
            ;
            if (username && name && password) {
                UsersService.addLocalUser(username, name, details.email, password).subscribe(user => {
                    if (details.roles) {
                        var roles = details.roles;
                        var brand = BrandingService.getBrand(req.session.branding);
                        var roleIds = RolesService.getRoleIds(brand.roles, roles);
                        UsersService.updateUserRoles(user.id, roleIds).subscribe(user => {
                            this.ajaxOk(req, res, "User created successfully");
                        }, error => {
                            sails.log.error("Failed to update user roles:");
                            sails.log.error(error);
                            this.ajaxFail(req, res, error.message);
                        });
                    }
                    else {
                        this.ajaxOk(req, res, "User created successfully");
                    }
                }, error => {
                    sails.log.error("Failed to create user:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                this.ajaxFail(req, res, "Please provide minimum of username, name and password");
            }
        }
        updateUserDetails(req, res) {
            var userid = req.body.userid;
            var details = req.body.details;
            if (details.name) {
                var name = details.name;
            }
            ;
            if (userid && name) {
                UsersService.updateUserDetails(userid, name, details.email, details.password).subscribe(user => {
                    if (details.roles) {
                        var roles = details.roles;
                        var brand = BrandingService.getBrand(req.session.branding);
                        var roleIds = RolesService.getRoleIds(brand.roles, roles);
                        UsersService.updateUserRoles(userid, roleIds).subscribe(user => {
                            this.ajaxOk(req, res, "User updated successfully");
                        }, error => {
                            sails.log.error("Failed to update user roles:");
                            sails.log.error(error);
                            this.ajaxFail(req, res, error.message);
                        });
                    }
                    else {
                        this.ajaxOk(req, res, "Save OK.");
                    }
                }, error => {
                    sails.log.error("Failed to update user details:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                this.ajaxFail(req, res, "Please provide minimum of userid and name");
            }
        }
        updateUserRoles(req, res) {
            var newRoleNames = req.body.roles;
            var userid = req.body.userid;
            if (userid && newRoleNames) {
                var brand = BrandingService.getBrand(req.session.branding);
                var roleIds = RolesService.getRoleIds(brand.roles, newRoleNames);
                UsersService.updateUserRoles(userid, roleIds).subscribe(user => {
                    this.ajaxOk(req, res, "Save OK.");
                }, error => {
                    sails.log.error("Failed to update user roles:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                this.ajaxFail(req, res, "Please provide userid and/or roles names.");
            }
        }
    }
    Controllers.Admin = Admin;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Admin().exports();
