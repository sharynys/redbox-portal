"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class UserManagement extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'render',
                'listUsers',
                'findUser'
            ];
        }
        bootstrap() {
        }
        render(req, res) {
            return this.sendView(req, res, 'dashboard');
        }
        listUsers(req, res) {
            var page = req.param('page');
            var pageSize = req.param('pageSize');
            if (page == null) {
                page = 1;
            }
            if (pageSize == null) {
                pageSize = 10;
            }
            User.count().exec(function (err, count) {
                var response = {};
                response["summary"] = {};
                response["summary"]["numFound"] = count;
                response["summary"]["page"] = page;
                if (count == 0) {
                    response["records"] = [];
                    return res.json(response);
                }
                else {
                    User.find().paginate({ page: 1, limit: 10 }).exec(function (err, users) {
                        response["records"] = users;
                        return res.json(response);
                    });
                }
            });
        }
        findUser(req, res) {
            var searchField = req.param('searchBy');
            var query = req.param('query');
            var queryObject = {};
            queryObject[searchField] = query;
            User.findOne(queryObject).exec(function (err, user) {
                if (err != null) {
                    return res.serverError(err);
                }
                if (user != null) {
                    return res.json(user);
                }
                return res.json({});
            });
        }
    }
    Controllers.UserManagement = UserManagement;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.UserManagement().exports();
