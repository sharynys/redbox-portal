"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Export extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'index',
                'downloadRecs'
            ];
        }
        index(req, res) {
            return this.sendView(req, res, 'export/index');
        }
        downloadRecs(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const format = req.param('format');
            const recType = req.param('recType');
            const before = _.isEmpty(req.query.before) ? null : req.query.before;
            const after = _.isEmpty(req.query.after) ? null : req.query.after;
            const filename = `${TranslationService.t(`${recType}-title`)} - Exported Records.${format}`;
            if (format == 'csv') {
                res.set('Content-Type', 'text/csv');
                res.set('Content-Disposition', `attachment; filename="${filename}"`);
                DashboardService.exportAllPlans(req.user.username, req.user.roles, brand, format, before, after, recType).subscribe(response => {
                    return res.send(200, response);
                });
            }
            else {
                return res.send(500, 'Unsupported export format');
            }
        }
    }
    Controllers.Export = Export;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Export().exports();
