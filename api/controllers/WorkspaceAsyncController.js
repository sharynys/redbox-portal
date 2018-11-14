"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class WorkspaceAsync extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'start',
                'loop'
            ];
        }
        start(req, res) {
            const name = req.param('name');
            const recordType = req.param('recordType');
            const username = req.username;
            const method = req.param('method');
            const args = req.param('args');
            WorkspaceAsyncService.start({ name, recordType, username, method, args })
                .subscribe(response => {
                this.ajaxOk(req, res, null, {});
            }, error => {
                sails.log.error(error);
                this.ajaxFail(req, res, 'Error registering async workspace', error);
            });
        }
    }
    Controllers.WorkspaceAsync = WorkspaceAsync;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
