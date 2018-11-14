"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Action extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'callService'
            ];
        }
        callService(req, res) {
            const actionName = req.param('action');
            const oid = req.param('oid');
            const options = {};
            let serviceFunction = eval(sails.config.action[actionName]);
            let response = serviceFunction(req.body, options);
            return response.subscribe(result => {
                return this.ajaxOk(req, res, null, result);
            });
        }
    }
    Controllers.Action = Action;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Action().exports();
