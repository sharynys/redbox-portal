"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const skipperGridFs = require("skipper-gridfs");
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class WorkspaceTypes extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this.uriCreds = `${sails.config.datastores.mongodb.user}${_.isEmpty(sails.config.datastores.mongodb.password) ? '' : `:${sails.config.datastores.mongodb.password}`}`;
            this.uriHost = `${sails.config.datastores.mongodb.host}${_.isNull(sails.config.datastores.mongodb.port) ? '' : `:${sails.config.datastores.mongodb.port}`}`;
            this.mongoUri = `mongodb://${_.isEmpty(this.uriCreds) ? '' : `${this.uriCreds}@`}${this.uriHost}/${sails.config.datastores.mongodb.database}`;
            this.blobAdapter = skipperGridFs({
                uri: this.mongoUri
            });
            this._exportedMethods = [
                'get',
                'getOne',
                'uploadLogo',
                'renderImage'
            ];
        }
        bootstrap() {
        }
        get(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            return WorkspaceTypesService.get(brand).subscribe(response => {
                let workspaceTypes = [];
                if (response) {
                    workspaceTypes = response.slice();
                }
                this.ajaxOk(req, res, null, { status: true, workspaceTypes: workspaceTypes });
            }, error => {
                const errorMessage = 'Cannot get workspace types';
                this.ajaxFail(req, res, error, errorMessage);
            });
        }
        getOne(req, res) {
            const name = req.param('name');
            const brand = BrandingService.getBrand(req.session.branding);
            return WorkspaceTypesService.getOne(brand, name)
                .subscribe(response => {
                let workspaceType = null;
                if (response) {
                    workspaceType = response;
                }
                this.ajaxOk(req, res, null, { status: true, workspaceType: workspaceType });
            }, error => {
                const errorMessage = 'Cannot get workspace types';
                this.ajaxFail(req, res, error, errorMessage);
            });
        }
        uploadLogo(req, res) {
            req.file('logo').upload({
                adapter: this.blobAdapter
            }, function (err, filesUploaded) {
                if (err)
                    this.ajaxFail(req, res, err);
                this.ajaxOk(req, res, null, { status: true });
            });
        }
        renderImage(req, res) {
            const type = req.param('workspaceType');
            const brand = BrandingService.getBrand(req.session.branding);
            return WorkspaceTypesService.getOne(brand, type).subscribe(response => {
                this.blobAdapter.read(response.logo, function (error, file) {
                    if (error) {
                        res.sendFile(sails.config.appPath + "assets/images/logo.png");
                    }
                    else {
                        res.contentType('image/png');
                        res.send(new Buffer(file));
                    }
                });
            });
        }
    }
    Controllers.WorkspaceTypes = WorkspaceTypes;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.WorkspaceTypes().exports();
