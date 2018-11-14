"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class Trigger extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'transitionWorkflow'
            ];
        }
        transitionWorkflow(oid, record, options) {
            const triggerCondition = _.get(options, "triggerCondition", "");
            var variables = {};
            variables['imports'] = record;
            var compiled = _.template(triggerCondition, variables);
            const compileResult = compiled();
            sails.log.verbose(`Trigger condition for ${oid} ==> "${triggerCondition}", has result: '${compileResult}'`);
            if (_.isEqual(compileResult, "true")) {
                const workflowStageTarget = _.get(options, "targetWorkflowStageName", _.get(record, 'workflow.stage'));
                const workflowStageLabel = _.get(options, "targetWorkflowStageLabel", _.get(record, 'workflow.stageLabel'));
                sails.log.verbose(`Trigger condition met for ${oid}, transitioning to: ${workflowStageTarget}`);
                _.set(record, "workflow.stage", workflowStageTarget);
                _.set(record, "workflow.stageLabel", workflowStageLabel);
                _.set(record, "metaMetadata.form", _.get(options, "targetForm", record.metaMetadata.form));
            }
            return Rx_1.Observable.of(record);
        }
    }
    Services.Trigger = Trigger;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Trigger().exports();
