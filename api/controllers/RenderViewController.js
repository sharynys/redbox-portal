"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class RenderView extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'render'
            ];
        }
        render(req, res) {
            var view = req.options.locals.view;
            if (view != null) {
                this.sendView(req, res, view);
            }
            else {
                res.notFound(req.options.locals, "404");
            }
        }
    }
    Controllers.RenderView = RenderView;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.RenderView().exports();
