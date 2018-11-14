"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuidv4 = require("uuid/v4");
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class User extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'login',
                'logout',
                'info',
                'aafLogin',
                'localLogin',
                'redirLogin',
                'redirPostLogin',
                'getPostLoginUrl',
                'respond',
                'update',
                'profile',
                'generateUserKey',
                'revokeUserKey',
                'find'
            ];
        }
        login(req, res) {
            this.sendView(req, res, sails.config.auth.loginPath);
        }
        profile(req, res) {
            this.sendView(req, res, "user/profile");
        }
        redirLogin(req, res) {
            if (req.path.indexOf(sails.config.auth.loginPath) == -1) {
                req.session.redirUrl = req.url;
            }
            return res.redirect(`${BrandingService.getBrandAndPortalPath(req)}/${sails.config.auth.loginPath}`);
        }
        redirPostLogin(req, res) {
            res.redirect(this.getPostLoginUrl(req, res));
        }
        getPostLoginUrl(req, res) {
            const branding = BrandingService.getBrandFromReq(req);
            let postLoginUrl = null;
            if (req.session.redirUrl) {
                postLoginUrl = req.session.redirUrl;
            }
            else {
                postLoginUrl = `${BrandingService.getBrandAndPortalPath(req)}/${ConfigService.getBrand(branding, 'auth').local.postLoginRedir}`;
            }
            sails.log.debug(`post login url: ${postLoginUrl}`);
            return postLoginUrl;
        }
        logout(req, res) {
            req.logout();
            req.session.destroy(err => {
                res.redirect(sails.config.auth.postLogoutRedir);
            });
        }
        info(req, res) {
            return res.json({ user: req.user });
        }
        update(req, res) {
            var userid;
            if (req.isAuthenticated()) {
                userid = req.user.id;
            }
            else {
                this.ajaxFail(req, res, "No current user session. Please login.");
            }
            if (!userid) {
                this.ajaxFail(req, res, "Error: unable to get user ID.");
            }
            var details = req.body.details;
            if (!details) {
                this.ajaxFail(req, res, "Error: user details not specified");
            }
            var name;
            if (details.name) {
                name = details.name;
            }
            ;
            if (name) {
                UsersService.updateUserDetails(userid, name, details.email, details.password).subscribe(user => {
                    this.ajaxOk(req, res, "Profile updated successfully.");
                }, error => {
                    sails.log.error("Failed to update user profile:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                this.ajaxFail(req, res, "Error: name must not be null");
            }
        }
        generateUserKey(req, res) {
            var userid;
            if (req.isAuthenticated()) {
                userid = req.user.id;
            }
            else {
                this.ajaxFail(req, res, "No current user session. Please login.");
            }
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
                return this.ajaxFail(req, res, "Error: unable to get user ID.");
            }
        }
        revokeUserKey(req, res) {
            var userid;
            if (req.isAuthenticated()) {
                userid = req.user.id;
            }
            else {
                this.ajaxFail(req, res, "No current user session. Please login.");
            }
            if (userid) {
                var uuid = null;
                UsersService.setUserKey(userid, uuid).subscribe(user => {
                    this.ajaxOk(req, res, "UUID revoked successfully");
                }, error => {
                    sails.log.error("Failed to revoke UUID:");
                    sails.log.error(error);
                    this.ajaxFail(req, res, error.message);
                });
            }
            else {
                return this.ajaxFail(req, res, "Error: unable to get user ID.");
            }
        }
        localLogin(req, res) {
            sails.config.passport.authenticate('local', function (err, user, info) {
                if ((err) || (!user)) {
                    return res.send({
                        message: info.message,
                        user: user
                    });
                }
                req.logIn(user, function (err) {
                    if (err)
                        res.send(err);
                    return sails.getActions()['user/respond'](req, res, (req, res) => {
                        return res.json({ user: user, message: 'Login OK', url: sails.getActions()['user/getpostloginurl'](req, res) });
                    }, (req, res) => {
                        return sails.getActions()['user/redirpostlogin'](req, res);
                    });
                });
            })(req, res);
        }
        aafLogin(req, res) {
            sails.config.passport.authenticate('aaf-jwt', function (err, user, info) {
                sails.log.verbose("At AAF Controller, verify...");
                sails.log.verbose("Error:");
                sails.log.verbose(err);
                sails.log.verbose("Info:");
                sails.log.verbose(info);
                sails.log.verbose("User:");
                sails.log.verbose(user);
                if ((err) || (!user)) {
                    return res.send({
                        message: info.message,
                        user: user
                    });
                }
                req.logIn(user, function (err) {
                    if (err)
                        res.send(err);
                    sails.log.debug("AAF Login OK, redirecting...");
                    return sails.getActions()['user/redirpostlogin'](req, res);
                });
            })(req, res);
        }
        find(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const searchSource = req.query.source;
            const searchName = req.query.name;
            UsersService.findUsersWithName(searchName, brand.id, searchSource).subscribe(users => {
                const userArr = _.map(users, user => {
                    return {
                        name: user.name,
                        id: user.id,
                        username: user.username
                    };
                });
                this.ajaxOk(req, res, null, userArr, true);
            }, error => {
                this.ajaxFail(req, res, null, error, true);
            });
        }
    }
    Controllers.User = User;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.User().exports();
