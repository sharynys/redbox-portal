"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class DynamicAsset extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'get'
            ];
        }
        get(req, res) {
            let assetId = req.param("asset");
            if (!assetId)
                assetId = 'apiClientConfig.json';
            sails.log.verbose(`Geting asset: ${assetId}`);
            res.set('Content-Type', sails.config.dynamicasset[assetId].type);
            return res.view(sails.config.dynamicasset[assetId].view, { layout: false });
        }
    }
    Controllers.DynamicAsset = DynamicAsset;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.DynamicAsset().exports();
