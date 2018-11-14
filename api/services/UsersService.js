"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const request = require("request-promise");
const crypto = require("crypto");
var Services;
(function (Services) {
    class Users extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'updateUserRoles',
                'updateUserDetails',
                'getUserWithId',
                'getUserWithUsername',
                'addLocalUser',
                'setUserKey',
                'hasRole',
                'findUsersWithName',
                'findUsersWithEmail',
                'findUsersWithQuery',
                'findAndAssignAccessToRecords',
                'getUsers',
            ];
            this.localAuthInit = () => {
                const defAuthConfig = ConfigService.getBrand(BrandingService.getDefault().name, 'auth');
                var usernameField = defAuthConfig.local.usernameField, passwordField = defAuthConfig.local.passwordField;
                sails.config.passport = require('passport');
                var LocalStrategy = require('passport-local').Strategy;
                var bcrypt = require('bcrypt');
                sails.config.passport.serializeUser(function (user, done) {
                    done(null, user.id);
                });
                sails.config.passport.deserializeUser(function (id, done) {
                    User.findOne({ id: id }).populate('roles').exec(function (err, user) {
                        done(err, user);
                    });
                });
                sails.config.passport.use(new LocalStrategy({
                    usernameField: usernameField,
                    passwordField: passwordField
                }, function (username, password, done) {
                    User.findOne({ username: username }).populate('roles').exec(function (err, foundUser) {
                        if (err) {
                            return done(err);
                        }
                        if (!foundUser) {
                            return done(null, false, { message: 'Incorrect username/password' });
                        }
                        bcrypt.compare(password, foundUser.password, function (err, res) {
                            if (!res) {
                                return done(null, false, {
                                    message: 'Incorrect username/password'
                                });
                            }
                            foundUser.lastLogin = new Date();
                            User.update({ username: foundUser.username }, { lastLogin: foundUser.lastLogin });
                            return done(null, foundUser, {
                                message: 'Logged In Successfully'
                            });
                        });
                    });
                }));
            };
            this.aafAuthInit = () => {
                const defAuthConfig = ConfigService.getBrand(BrandingService.getDefault().name, 'auth');
                var JwtStrategy = require('passport-jwt').Strategy, ExtractJwt = require('passport-jwt').ExtractJwt;
                const aafOpts = defAuthConfig.aaf.opts;
                aafOpts.jwtFromRequest = ExtractJwt.fromBodyField('assertion');
                sails.config.passport.use('aaf-jwt', new JwtStrategy(aafOpts, function (req, jwt_payload, done) {
                    var brand = BrandingService.getBrand(req.session.branding);
                    const authConfig = ConfigService.getBrand(brand.name, 'auth');
                    var aafAttributes = authConfig.aaf.attributesField;
                    var aafDefRoles = _.map(RolesService.getNestedRoles(RolesService.getDefAuthenticatedRole(brand).name, brand.roles), 'id');
                    var aafUsernameField = authConfig.aaf.usernameField;
                    const userName = Buffer.from(jwt_payload[aafUsernameField]).toString('base64');
                    User.findOne({ username: userName }, function (err, user) {
                        sails.log.verbose("At AAF Strategy verify, payload:");
                        sails.log.verbose(jwt_payload);
                        sails.log.verbose("User:");
                        sails.log.verbose(user);
                        sails.log.verbose("Error:");
                        sails.log.verbose(err);
                        if (err) {
                            return done(err, false);
                        }
                        if (user) {
                            user.lastLogin = new Date();
                            User.update(user).exec(function (err, user) {
                            });
                            return done(null, user);
                        }
                        else {
                            sails.log.verbose("At AAF Strategy verify, creating new user...");
                            var userToCreate = {
                                username: userName,
                                name: jwt_payload[aafAttributes].cn,
                                email: jwt_payload[aafAttributes].mail,
                                displayname: jwt_payload[aafAttributes].displayname,
                                cn: jwt_payload[aafAttributes].cn,
                                edupersonscopedaffiliation: jwt_payload[aafAttributes].edupersonscopedaffiliation,
                                edupersontargetedid: jwt_payload[aafAttributes].edupersontargetedid,
                                edupersonprincipalname: jwt_payload[aafAttributes].edupersonprincipalname,
                                givenname: jwt_payload[aafAttributes].givenname,
                                surname: jwt_payload[aafAttributes].surname,
                                type: 'aaf',
                                roles: aafDefRoles,
                                lastLogin: new Date()
                            };
                            sails.log.verbose(userToCreate);
                            User.create(userToCreate).exec(function (err, newUser) {
                                if (err) {
                                    sails.log.error("Error creating new user:");
                                    sails.log.error(err);
                                    return done(err, false);
                                }
                                sails.log.verbose("Done, returning new user:");
                                sails.log.verbose(newUser);
                                return done(null, newUser);
                            });
                        }
                    });
                }));
            };
            this.bearerTokenAuthInit = () => {
                var BearerStrategy = require('passport-http-bearer').Strategy;
                sails.config.passport.use('bearer', new BearerStrategy(function (token, done) {
                    if (!_.isEmpty(token) && !_.isUndefined(token)) {
                        const tokenHash = crypto.createHash('sha256').update(token).digest('base64');
                        User.findOne({ token: tokenHash }).populate('roles').exec(function (err, user) {
                            if (err) {
                                return done(err);
                            }
                            if (!user) {
                                return done(null, false);
                            }
                            return done(null, user, { scope: 'all' });
                        });
                    }
                    else {
                        return done(null, false);
                    }
                }));
            };
            this.initDefAdmin = (defRoles, defAdminRole) => {
                const authConfig = ConfigService.getBrand(BrandingService.getDefault().name, 'auth');
                var usernameField = authConfig.local.usernameField, passwordField = authConfig.local.passwordField;
                var defaultUser = _.find(defAdminRole.users, (o) => { return o[usernameField] == authConfig.local.default.adminUser; });
                if (defaultUser == null) {
                    defaultUser = { type: 'local', name: 'Local Admin' };
                    defaultUser[usernameField] = authConfig.local.default.adminUser;
                    defaultUser[passwordField] = authConfig.local.default.adminPw;
                    defaultUser["email"] = authConfig.local.default.email;
                    if (authConfig.local.default.token) {
                        defaultUser["token"] = authConfig.local.default.token;
                    }
                    sails.log.verbose("Default user missing, creating...");
                    return super.getObservable(User.create(defaultUser))
                        .flatMap(defUser => {
                        const defRoleIds = _.map(defRoles, (o) => {
                            return o.id;
                        });
                        let q = User.addToCollection(defUser.id, 'roles').members(defRoleIds);
                        return super.getObservable(q, 'exec', 'simplecb')
                            .flatMap(dUser => {
                            return Rx_1.Observable.from(defRoles)
                                .map(roleObserved => {
                                let role = roleObserved;
                                q = Role.addToCollection(role.id, 'users').members([defUser.id]);
                                return super.getObservable(q, 'exec', 'simplecb');
                            });
                        })
                            .last()
                            .flatMap(lastRole => {
                            return Rx_1.Observable.of({ defUser: defUser, defRoles: defRoles });
                        });
                    });
                }
                else {
                    return Rx_1.Observable.of({ defUser: defaultUser, defRoles: defRoles });
                }
            };
            this.addLocalUser = (username, name, email, password) => {
                const authConfig = ConfigService.getBrand(BrandingService.getDefault().name, 'auth');
                var usernameField = authConfig.local.usernameField, passwordField = authConfig.local.passwordField;
                return this.getUserWithUsername(username).flatMap(user => {
                    if (user) {
                        return Rx_1.Observable.throw(new Error('Username already exists'));
                    }
                    else {
                        return this.findUsersWithEmail(email, null, null).flatMap(emailCheck => {
                            if (_.size(emailCheck) > 0) {
                                return Rx_1.Observable.throw(new Error('Email already exists, it must be unique.'));
                            }
                            else {
                                var newUser = { type: 'local', name: name };
                                if (!_.isEmpty(email)) {
                                    newUser["email"] = email;
                                }
                                newUser[usernameField] = username;
                                newUser[passwordField] = password;
                                return super.getObservable(User.create(newUser));
                            }
                        });
                    }
                });
            };
            this.bootstrap = (defRoles) => {
                const defAuthConfig = ConfigService.getBrand(BrandingService.getDefault().name, 'auth');
                sails.log.verbose("Bootstrapping users....");
                var usernameField = defAuthConfig.local.usernameField, passwordField = defAuthConfig.local.passwordField;
                var defAdminRole = RolesService.getAdminFromRoles(defRoles);
                return Rx_1.Observable.of(defAdminRole)
                    .flatMap(defAdminRole => {
                    this.localAuthInit();
                    this.aafAuthInit();
                    this.bearerTokenAuthInit();
                    return this.initDefAdmin(defRoles, defAdminRole);
                });
            };
            this.getUserWithUsername = (username) => {
                return this.getObservable(User.findOne({ username: username }).populate('roles'));
            };
            this.getUserWithId = (userid) => {
                return this.getObservable(User.findOne({ id: userid }).populate('roles'));
            };
            this.getUsers = () => {
                return super.getObservable(User.find({}).populate('roles'));
            };
            this.setUserKey = (userid, uuid) => {
                const uuidHash = _.isEmpty(uuid) ? uuid : crypto.createHash('sha256').update(uuid).digest('base64');
                return this.getUserWithId(userid).flatMap(user => {
                    if (user) {
                        const q = User.update({ id: userid }, { token: uuidHash });
                        return this.getObservable(q, 'exec', 'simplecb');
                    }
                    else {
                        return Rx_1.Observable.throw(new Error('No such user with id:' + userid));
                    }
                });
            };
            this.updateUserDetails = (userid, name, email, password) => {
                const authConfig = ConfigService.getBrand(BrandingService.getDefault().name, 'auth');
                var passwordField = authConfig.local.passwordField;
                return this.getUserWithId(userid).flatMap(user => {
                    if (user) {
                        const update = { name: name };
                        if (!_.isEmpty(email)) {
                            update["email"] = email;
                        }
                        if (!_.isEmpty(password)) {
                            var bcrypt = require('bcrypt');
                            var salt = salt = bcrypt.genSaltSync(10);
                            update[passwordField] = bcrypt.hashSync(password, salt);
                        }
                        const q = User.update({ id: userid }, update);
                        return this.getObservable(q, 'exec', 'simplecb');
                    }
                    else {
                        return Rx_1.Observable.throw(new Error('No such user with id:' + userid));
                    }
                });
            };
            this.updateUserRoles = (userid, newRoleIds) => {
                return this.getUserWithId(userid).flatMap(user => {
                    if (user) {
                        if (_.isEmpty(newRoleIds) || newRoleIds.length == 0) {
                            return Rx_1.Observable.throw(new Error('Please assign at least one role'));
                        }
                        const q = User.replaceCollection(user.id, 'roles').members(newRoleIds);
                        return this.getObservable(q, 'exec', 'simplecb');
                    }
                    else {
                        return Rx_1.Observable.throw(new Error('No such user with id:' + userid));
                    }
                });
            };
        }
        hasRole(user, targetRole) {
            return _.find(user.roles, (role) => {
                return role.id == targetRole.id;
            });
        }
        findUsersWithName(name, brandId, source = null) {
            const query = { name: { 'contains': name } };
            return this.findUsersWithQuery(query, brandId, source);
        }
        findUsersWithEmail(email, brandId, source) {
            const query = { email: { 'contains': email } };
            return this.findUsersWithQuery(query, brandId, source);
        }
        findUsersWithQuery(query, brandId, source = null) {
            if (!_.isEmpty(source) && !_.isUndefined(source) && !_.isNull(source)) {
                query['type'] = source;
            }
            return this.getObservable(User.find(query).populate('roles'))
                .flatMap(users => {
                if (brandId) {
                    _.remove(users, (user) => {
                        const isInBrand = _.find(user.roles, (role) => {
                            return role.branding == brandId;
                        });
                        return !isInBrand;
                    });
                }
                return Rx_1.Observable.of(users);
            });
        }
        findAndAssignAccessToRecords(pendingValue, userid) {
            var url = `${sails.config.record.baseUrl.redbox}${sails.config.record.api.search.url}?q=authorization_editPending:${pendingValue}%20OR%20authorization_viewPending:${pendingValue}&sort=date_object_modified desc&version=2.2&wt=json&rows=10000`;
            var options = { url: url, json: true, headers: { 'Authorization': `Bearer ${sails.config.redbox.apiKey}`, 'Content-Type': 'application/json; charset=utf-8' } };
            var response = Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options)).catch(error => Rx_1.Observable.of(`Error: ${error}`));
            response.subscribe(results => {
                if (results["response"] != null) {
                    var docs = results["response"]["docs"];
                    for (var i = 0; i < docs.length; i++) {
                        var doc = docs[i];
                        var item = {};
                        var oid = doc["storage_id"];
                        RecordsService.provideUserAccessAndRemovePendingAccess(oid, userid, pendingValue);
                    }
                }
            });
        }
    }
    Services.Users = Users;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Users().exports();
