"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class WorkflowSteps extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'create',
                'get',
                'getFirst',
                'getAllForRecordType'
            ];
            this.bootstrap = (recordTypes) => {
                let startQ = WorkflowStep.find({});
                if (sails.config.appmode.bootstrapAlways) {
                    startQ = WorkflowStep.destroy({});
                }
                return super.getObservable(startQ)
                    .flatMap(workflows => {
                    sails.log.debug(`WorkflowSteps found: ${workflows} and boostrapAlways set to: ${sails.config.appmode.bootstrapAlways}`);
                    if (_.isEmpty(workflows)) {
                        sails.log.verbose("Bootstrapping workflow definitions... ");
                        const wfSteps = {};
                        _.forEach(recordTypes, recordType => {
                            sails.log.verbose("Processing recordType: " + recordType.name);
                            wfSteps[recordType.name] = [];
                            _.forOwn(sails.config.workflow[recordType.name], (workflowConf, workflowName) => {
                                if (workflowName != null) {
                                    sails.log.verbose("workflow step added to list: " + workflowName);
                                    wfSteps[recordType.name].push({ "recordType": recordType, "workflow": workflowName });
                                }
                            });
                        });
                        return Rx_1.Observable.of(wfSteps);
                    }
                    else {
                        return Rx_1.Observable.of(workflows);
                    }
                }).flatMap(wfSteps => {
                    sails.log.verbose(`wfSteps: `);
                    sails.log.verbose(JSON.stringify(wfSteps));
                    if (_.isArray(wfSteps) && wfSteps[0]["config"] != null) {
                        sails.log.verbose(`return as Observable of`);
                        return Rx_1.Observable.from(wfSteps);
                    }
                    else {
                        var workflowSteps = [];
                        _.forOwn(wfSteps, (workflowStepsObject, recordTypeName) => {
                            _.forEach(workflowStepsObject, workflowStep => {
                                const workflowConf = sails.config.workflow[recordTypeName][workflowStep["workflow"]];
                                var obs = this.create(workflowStep["recordType"], workflowStep["workflow"], workflowConf.config, workflowConf.starting == true);
                                workflowSteps.push(obs);
                            });
                        });
                        return Rx_1.Observable.zip(...workflowSteps);
                    }
                });
            };
        }
        create(recordType, name, workflowConf, starting) {
            return super.getObservable(WorkflowStep.create({
                name: name,
                config: workflowConf,
                recordType: recordType.id,
                starting: starting
            }));
        }
        get(recordType, name) {
            return super.getObservable(WorkflowStep.findOne({ recordType: recordType.id, name: name }));
        }
        getAllForRecordType(recordType) {
            return super.getObservable(WorkflowStep.find({ recordType: recordType.id }));
        }
        getFirst(recordType) {
            return super.getObservable(WorkflowStep.findOne({ recordType: recordType.id, starting: true }));
        }
    }
    Services.WorkflowSteps = WorkflowSteps;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.WorkflowSteps().exports();
