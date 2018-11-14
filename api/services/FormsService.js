"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class Forms extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'getForm',
                'flattenFields',
                'getFormByName'
            ];
            this.bootstrap = (workflowStep) => {
                let startQ = Form.find({ workflowStep: workflowStep.id });
                if (sails.config.appmode.bootstrapAlways) {
                    sails.log.verbose(`Destroying existing form definitions: ${workflowStep.config.form}`);
                    startQ = Form.destroy({ name: workflowStep.config.form });
                }
                let formDefs = [];
                return super.getObservable(startQ)
                    .flatMap(form => {
                    sails.log.verbose("Found : ");
                    sails.log.verbose(form);
                    if (!form || form.length == 0) {
                        sails.log.verbose("Bootstrapping form definitions..");
                        _.forOwn(sails.config.form.forms, (formDef, formName) => {
                            if (formName == workflowStep.config.form) {
                                formDefs.push(formName);
                            }
                        });
                        formDefs = _.uniq(formDefs);
                        sails.log.verbose(JSON.stringify(formDefs));
                        return Rx_1.Observable.from(formDefs);
                    }
                    else {
                        sails.log.verbose("Not Bootstrapping form definitions... ");
                        return Rx_1.Observable.of(null);
                    }
                })
                    .flatMap(formName => {
                    return this.getObservable(Form.find({ name: formName })).flatMap(existingFormDef => {
                        return Rx_1.Observable.of({ formName: formName, existingFormDef: existingFormDef });
                    });
                })
                    .flatMap(existCheck => {
                    sails.log.verbose(`Existing form check: ${existCheck.formName}`);
                    sails.log.verbose(JSON.stringify(existCheck));
                    if (_.isUndefined(existCheck.existingFormDef) || _.isEmpty(existCheck.existingFormDef)) {
                        return Rx_1.Observable.of(existCheck.formName);
                    }
                    else {
                        sails.log.verbose(`Existing form definition for form name: ${existCheck.existingFormDef.name}, ignoring bootstrap.`);
                        return Rx_1.Observable.of(null);
                    }
                })
                    .flatMap(formName => {
                    sails.log.verbose("FormName is:");
                    sails.log.verbose(formName);
                    let observable = Rx_1.Observable.of(null);
                    if (!_.isNull(formName)) {
                        sails.log.verbose(`Preparing to create form...`);
                        const formObj = {
                            name: formName,
                            fields: sails.config.form.forms[formName].fields,
                            workflowStep: workflowStep.id,
                            type: sails.config.form.forms[formName].type,
                            messages: sails.config.form.forms[formName].messages,
                            viewCssClasses: sails.config.form.forms[formName].viewCssClasses,
                            editCssClasses: sails.config.form.forms[formName].editCssClasses,
                            skipValidationOnSave: sails.config.form.forms[formName].skipValidationOnSave,
                            attachmentFields: sails.config.form.forms[formName].attachmentFields,
                            customAngularApp: sails.config.form.forms[formName].customAngularApp || null
                        };
                        var q = Form.create(formObj);
                        observable = Rx_1.Observable.bindCallback(q["exec"].bind(q))();
                    }
                    return observable;
                })
                    .flatMap(result => {
                    if (result) {
                        sails.log.verbose("Created form record: ");
                        sails.log.verbose(result);
                        return Rx_1.Observable.from(result);
                    }
                    return Rx_1.Observable.of(result);
                }).flatMap(result => {
                    if (result) {
                        sails.log.verbose(`Updating workflowstep ${result.workflowStep} to: ${result.id}`);
                        const q = WorkflowStep.update({ id: result.workflowStep }).set({ form: result.id });
                        return Rx_1.Observable.bindCallback(q["exec"].bind(q))();
                    }
                    return Rx_1.Observable.of(null);
                });
            };
            this.getFormByName = (formName, editMode) => {
                return super.getObservable(Form.findOne({ name: formName })).flatMap(form => {
                    if (form) {
                        this.setFormEditMode(form.fields, editMode);
                        return Rx_1.Observable.of(form);
                    }
                    return Rx_1.Observable.of(null);
                });
            };
            this.getForm = (branding, recordType, editMode, starting) => {
                return super.getObservable(RecordType.findOne({ key: branding + "_" + recordType }))
                    .flatMap(recordType => {
                    return super.getObservable(WorkflowStep.findOne({ recordType: recordType.id, starting: starting }));
                }).flatMap(workflowStep => {
                    if (workflowStep.starting == true) {
                        return super.getObservable(Form.findOne({ name: workflowStep.config.form }));
                    }
                    return Rx_1.Observable.of(null);
                }).flatMap(form => {
                    if (form) {
                        this.setFormEditMode(form.fields, editMode);
                        return Rx_1.Observable.of(form);
                    }
                    return Rx_1.Observable.of(null);
                }).filter(result => result !== null).last();
            };
        }
        setFormEditMode(fields, editMode) {
            _.remove(fields, field => {
                if (editMode) {
                    return field.viewOnly == true;
                }
                else {
                    return field.editOnly == true;
                }
            });
            _.forEach(fields, field => {
                field.definition.editMode = editMode;
                if (!_.isEmpty(field.definition.fields)) {
                    this.setFormEditMode(field.definition.fields, editMode);
                }
            });
        }
        flattenFields(fields, fieldArr) {
            _.map(fields, (f) => {
                fieldArr.push(f);
                if (f.fields) {
                    this.flattenFields(f.fields, fieldArr);
                }
            });
        }
    }
    Services.Forms = Forms;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Forms().exports();
