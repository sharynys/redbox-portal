"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Dashboard extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'render',
                'getRecordList'
            ];
        }
        bootstrap() {
        }
        render(req, res) {
            const recordType = req.param('recordType') ? req.param('recordType') : '';
            return this.sendView(req, res, 'dashboard', { recordType: recordType });
        }
        getRecordList(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const editAccessOnly = req.query.editOnly;
            var roles = [];
            var username = "guest";
            let user = {};
            if (req.isAuthenticated()) {
                roles = req.user.roles;
                user = req.user;
                username = req.user.username;
            }
            else {
                user = { username: username };
                roles = [];
                roles.push(RolesService.getDefUnathenticatedRole(brand));
            }
            const recordType = req.param('recordType');
            const workflowState = req.param('state');
            const start = req.param('start');
            const rows = req.param('rows');
            const packageType = req.param('packageType');
            const sort = req.param('sort');
            this.getRecords(workflowState, recordType, start, rows, user, roles, brand, editAccessOnly, packageType, sort).flatMap(results => {
                return results;
            }).subscribe(response => {
                if (response && response.code == "200") {
                    response.success = true;
                    this.ajaxOk(req, res, null, response);
                }
                else {
                    this.ajaxFail(req, res, null, response);
                }
            }, error => {
                sails.log.error("Error updating meta:");
                sails.log.error(error);
                this.ajaxFail(req, res, error.message);
            });
        }
        getDocMetadata(doc) {
            var metadata = {};
            for (var key in doc) {
                if (key.indexOf('authorization_') != 0 && key.indexOf('metaMetadata_') != 0) {
                    metadata[key] = doc[key];
                }
                if (key == 'authorization_editRoles') {
                    metadata[key] = doc[key];
                }
            }
            return metadata;
        }
        getRecords(workflowState, recordType, start, rows, user, roles, brand, editAccessOnly = undefined, packageType = undefined, sort = undefined) {
            const username = user.username;
            if (!_.isUndefined(recordType) && !_.isEmpty(recordType)) {
                recordType = recordType.split(',');
            }
            if (!_.isUndefined(packageType) && !_.isEmpty(packageType)) {
                packageType = packageType.split(',');
            }
            var response = DashboardService.getRecords(workflowState, recordType, start, rows, username, roles, brand, editAccessOnly, packageType, sort);
            return response.map(results => {
                var totalItems = results["response"]["numFound"];
                var startIndex = results["response"]["start"];
                var noItems = 10;
                var pageNumber = (startIndex / noItems) + 1;
                var response = {};
                response["totalItems"] = totalItems;
                response["currentPage"] = pageNumber;
                response["noItems"] = noItems;
                var items = [];
                var docs = results["response"]["docs"];
                for (var i = 0; i < docs.length; i++) {
                    var doc = docs[i];
                    var item = {};
                    item["oid"] = doc["redboxOid"];
                    item["title"] = doc["metadata"]["title"];
                    item["metadata"] = this.getDocMetadata(doc);
                    item["dateCreated"] = doc["date_object_created"][0];
                    item["dateModified"] = doc["date_object_modified"][0];
                    item["hasEditAccess"] = RecordsService.hasEditAccess(brand, user, roles, doc);
                    items.push(item);
                }
                response["items"] = items;
                return Rx_1.Observable.of(response);
            });
        }
    }
    Controllers.Dashboard = Dashboard;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Dashboard().exports();
