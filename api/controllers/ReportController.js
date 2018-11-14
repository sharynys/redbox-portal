"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Report extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'render',
                'get',
                'getResults',
                'downloadCSV'
            ];
        }
        bootstrap() {
        }
        render(req, res) {
            return this.sendView(req, res, 'admin/report');
        }
        get(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            ReportsService.get(brand, req.param('name')).subscribe(response => {
                return this.ajaxOk(req, res, null, response);
            });
        }
        getResults(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var response = ReportsService.getResults(brand, req.param('name'), req, req.param('start'), req.param('rows'));
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
                    for (var key in doc) {
                        item[key] = doc[key];
                    }
                    items.push(item);
                }
                response["items"] = items;
                return Rx_1.Observable.of(response);
            }).flatMap(results => {
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
            ;
        }
        downloadCSV(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var response = ReportsService.getCSVResult(brand, req.param('name'));
            response.subscribe(results => {
                res.setHeader('Content-disposition', 'attachment; filename=' + req.param('name') + '.csv');
                res.set('Content-Type', 'text/csv');
                res.status(200).send(results);
                return res;
            });
        }
    }
    Controllers.Report = Report;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Report().exports();
