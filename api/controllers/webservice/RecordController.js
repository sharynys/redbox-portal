"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const controller = require("../../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Record extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'create',
                'updateMeta',
                'getMeta',
                'addUserEdit',
                'removeUserEdit',
                'addUserView',
                'removeUserView',
                'getPermissions',
                'getDataStream'
            ];
        }
        bootstrap() {
        }
        getPermissions(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            RecordsService.getMeta(oid).subscribe(record => {
                return res.json(record["authorization"]);
            });
        }
        addUserEdit(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            var body = req.body;
            var users = body["users"];
            var pendingUsers = body["pendingUsers"];
            RecordsService.getMeta(oid).subscribe(record => {
                if (users != null && users.length > 0) {
                    record["authorization"]["edit"] = _.union(record["authorization"]["edit"], users);
                }
                if (pendingUsers != null && pendingUsers.length > 0) {
                    record["authorization"]["editPending"] = _.union(record["authorization"]["editPending"], pendingUsers);
                }
                var obs = RecordsService.updateMeta(brand, oid, record);
                obs.subscribe(result => {
                    if (result["code"] == 200) {
                        RecordsService.getMeta(result["oid"]).subscribe(record => {
                            return res.json(record["authorization"]);
                        });
                    }
                    else {
                        return res.json(result);
                    }
                });
            });
        }
        addUserView(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            var body = req.body;
            var users = body["users"];
            var pendingUsers = body["pendingUsers"];
            RecordsService.getMeta(oid).subscribe(record => {
                if (users != null && users.length > 0) {
                    record["authorization"]["view"] = _.union(record["authorization"]["view"], users);
                }
                if (pendingUsers != null && pendingUsers.length > 0) {
                    record["authorization"]["viewPending"] = _.union(record["authorization"]["viewPending"], pendingUsers);
                }
                var obs = RecordsService.updateMeta(brand, oid, record);
                obs.subscribe(result => {
                    if (result["code"] == 200) {
                        RecordsService.getMeta(result["oid"]).subscribe(record => {
                            return res.json(record["authorization"]);
                        });
                    }
                    else {
                        return res.json(result);
                    }
                });
            });
        }
        removeUserEdit(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            var body = req.body;
            var users = body["users"];
            var pendingUsers = body["pendingUsers"];
            RecordsService.getMeta(oid).subscribe(record => {
                if (users != null && users.length > 0) {
                    record["authorization"]["edit"] = _.difference(record["authorization"]["edit"], users);
                }
                if (pendingUsers != null && pendingUsers.length > 0) {
                    record["authorization"]["editPending"] = _.difference(record["authorization"]["editPending"], pendingUsers);
                }
                var obs = RecordsService.updateMeta(brand, oid, record);
                obs.subscribe(result => {
                    if (result["code"] == 200) {
                        RecordsService.getMeta(result["oid"]).subscribe(record => {
                            return res.json(record["authorization"]);
                        });
                    }
                    else {
                        return res.json(result);
                    }
                });
            });
        }
        removeUserView(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            var body = req.body;
            var users = body["users"];
            var pendingUsers = body["pendingUsers"];
            RecordsService.getMeta(oid).subscribe(record => {
                if (users != null && users.length > 0) {
                    record["authorization"]["view"] = _.difference(record["authorization"]["view"], users);
                }
                if (pendingUsers != null && pendingUsers.length > 0) {
                    record["authorization"]["viewPending"] = _.difference(record["authorization"]["viewPending"], pendingUsers);
                }
                var obs = RecordsService.updateMeta(brand, oid, record);
                obs.subscribe(result => {
                    if (result["code"] == 200) {
                        RecordsService.getMeta(result["oid"]).subscribe(record => {
                            return res.json(record["authorization"]);
                        });
                    }
                    else {
                        return res.json(result);
                    }
                });
            });
        }
        getMeta(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            RecordsService.getMeta(oid).subscribe(record => {
                return res.json(record["metadata"]);
            });
        }
        updateMeta(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var oid = req.param('oid');
            RecordsService.getMeta(oid).subscribe(record => {
                record["metadata"] = req.body;
                var obs = RecordsService.updateMeta(brand, oid, record);
                obs.subscribe(result => {
                    return res.json(result);
                });
            });
        }
        create(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var recordType = req.param('recordType');
            var body = req.body;
            if (body != null) {
                var authorizationEdit, authorizationView, authorizationEditPending, authorizationViewPending;
                if (body["authorization"] != null) {
                    authorizationEdit = body["authorization"]["edit"];
                    authorizationView = body["authorization"]["view"];
                    authorizationEditPending = body["authorization"]["editPending"];
                    authorizationViewPending = body["authorization"]["viewPending"];
                }
                else {
                    body["authorization"] = [];
                    authorizationEdit = [];
                    authorizationView = [];
                    authorizationEdit.push(req.user.username);
                    authorizationView.push(req.user.username);
                }
                var recordTypeObservable = RecordTypesService.get(brand, recordType);
                recordTypeObservable.subscribe(recordTypeModel => {
                    if (recordTypeModel) {
                        var metadata = body["metadata"];
                        var workflowStage = body["workflowStage"];
                        var request = {};
                        var metaMetadata = {};
                        metaMetadata["brandId"] = brand.id;
                        metaMetadata["type"] = recordTypeModel.name;
                        metaMetadata["createdBy"] = "admin";
                        request["metaMetadata"] = metaMetadata;
                        if (metadata == null) {
                            request["metadata"] = body;
                        }
                        else {
                            request["metadata"] = metadata;
                        }
                        var workflowStepsObs = WorkflowStepsService.getAllForRecordType(recordTypeModel);
                        workflowStepsObs.subscribe(workflowSteps => {
                            _.each(workflowSteps, function (workflowStep) {
                                if (workflowStage == null) {
                                    if (workflowStep["starting"] == true) {
                                        request["workflow"] = workflowStep["config"]["workflow"];
                                        request["authorization"] = workflowStep["config"]["authorization"];
                                        request["authorization"]["view"] = authorizationView;
                                        request["authorization"]["edit"] = authorizationEdit;
                                        request["authorization"]["viewPending"] = authorizationViewPending;
                                        request["authorization"]["editPending"] = authorizationEditPending;
                                        metaMetadata["form"] = workflowStep["config"]["form"];
                                    }
                                }
                                else {
                                    if (workflowStep["name"] == workflowStage) {
                                        request["workflow"] = workflowStep["config"]["workflow"];
                                        request["authorization"] = workflowStep["config"]["authorization"];
                                        request["authorization"]["view"] = authorizationView;
                                        request["authorization"]["edit"] = authorizationEdit;
                                        request["authorization"]["viewPending"] = authorizationViewPending;
                                        request["authorization"]["editPending"] = authorizationEditPending;
                                        metaMetadata["form"] = workflowStep["config"]["form"];
                                    }
                                }
                            });
                            var obs = RecordsService.create(brand, request, recordTypeModel.packageType);
                            obs.subscribe(result => {
                                if (result["code"] == "200") {
                                    result["code"] = 201;
                                    res.set('Location', sails.config.appUrl + BrandingService.getBrandAndPortalPath(req) + "/api/records/metadata/" + result["oid"]);
                                }
                                return res.status(201).json(result);
                            });
                        });
                    }
                    else {
                        return res.status(400).json({ message: "Record Type provided is not valid" });
                    }
                });
            }
        }
        getDataStream(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const oid = req.param('oid');
            const datastreamId = req.param('datastreamId');
            sails.log.info(`getDataStream ${oid} ${datastreamId}`);
            return RecordsService.getMeta(oid).flatMap(currentRec => {
                const fileName = req.param('fileName') ? req.param('fileName') : datastreamId;
                res.set('Content-Type', 'application/octet-stream');
                res.set('Content-Disposition', `attachment; filename="${fileName}"`);
                sails.log.info(`Returning datastream observable of ${oid}: ${fileName}, datastreamId: ${datastreamId}`);
                return RecordsService.getDatastream(oid, datastreamId).flatMap((response) => {
                    res.end(Buffer.from(response.body), 'binary');
                    return Rx_1.Observable.of(oid);
                });
            }).subscribe(whatever => {
            }, error => {
                return res.status(500).json({ message: error.error.toString('UTF-8') });
            });
        }
    }
    Controllers.Record = Record;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Record().exports();
