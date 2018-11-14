"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Reports extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'render'
            ];
        }
        bootstrap() {
        }
        render(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            ReportsService.findAllReportsForBrand(brand).subscribe(reports => {
                req.options.locals["reports"] = reports;
                return this.sendView(req, res, 'admin/reports');
            });
        }
    }
    Controllers.Reports = Reports;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Reports().exports();
