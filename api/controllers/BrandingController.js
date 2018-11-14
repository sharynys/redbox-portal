"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
const skipperGridFs = require("skipper-gridfs");
require("rxjs/add/operator/toPromise");
var Controllers;
(function (Controllers) {
    class Branding extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this.mongoUri = sails.config.datastores.mongodb.url;
            this.blobAdapter = skipperGridFs({
                uri: this.mongoUri
            });
            this._exportedMethods = [
                'renderCss',
                'renderImage',
                'renderApiB',
                'renderSwaggerJSON',
                'renderSwaggerYAML'
            ];
        }
        renderCss(req, res) {
            BrandingConfig.findOne({
                "name": req.param('branding')
            }).exec(function (err, theme) {
                res.set('Content-Type', 'text/css');
                if (theme != null) {
                    return res.send(theme['css']);
                }
                else {
                    return res.send("/* Using the default theme */");
                }
            });
        }
        renderApiB(req, res) {
            res.contentType('text/plain');
            return this.sendView(req, res, "apidocsapib", { layout: false });
        }
        renderSwaggerJSON(req, res) {
            res.contentType('application/json');
            return this.sendView(req, res, "apidocsswaggerjson", { layout: false });
        }
        renderSwaggerYAML(req, res) {
            res.contentType('application/x-yaml');
            return this.sendView(req, res, "apidocsswaggeryaml", { layout: false });
        }
        renderImage(req, res) {
            var fd = req.param("branding") + "/logo.png";
            this.blobAdapter.read(fd, function (error, file) {
                if (error) {
                    res.sendFile(sails.config.appPath + "/assets/images/logo.png");
                }
                else {
                    res.contentType('image/png');
                    res.send(new Buffer(file));
                }
            });
        }
    }
    Controllers.Branding = Branding;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Branding().exports();
