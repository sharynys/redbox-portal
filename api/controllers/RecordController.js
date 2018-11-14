"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const moment_es6_1 = require("moment-es6");
const tus = require("tus-node-server");
const fs = require("fs");
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Record extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'edit',
                'getForm',
                'create',
                'update',
                'stepTo',
                'modifyEditors',
                'search',
                'getType',
                'getWorkflowSteps',
                'getMeta',
                'getTransferResponsibilityConfig',
                'updateResponsibilities',
                'doAttachment',
                'getAttachments',
                'getDataStream',
                'getAllTypes',
                'delete'
            ];
        }
        bootstrap() {
        }
        getMeta(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const oid = req.param('oid') ? req.param('oid') : '';
            var obs = RecordsService.getMeta(oid);
            return obs.subscribe(record => {
                this.hasViewAccess(brand, req.user, record).subscribe(hasViewAccess => {
                    if (hasViewAccess) {
                        return res.json(record.metadata);
                    }
                    else {
                        return res.json({ status: "Access Denied" });
                    }
                });
            });
        }
        edit(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const oid = req.param('oid') ? req.param('oid') : '';
            const recordType = req.param('recordType') ? req.param('recordType') : '';
            const rdmp = req.query.rdmp ? req.query.rdmp : '';
            let appSelector = 'dmp-form';
            let appName = 'dmp';
            sails.log.debug('RECORD::APP: ' + appName);
            if (recordType != '') {
                FormsService.getForm(brand.id, recordType, true, true).subscribe(form => {
                    if (form['customAngularApp'] != null) {
                        appSelector = form['customAngularApp']['appSelector'];
                        appName = form['customAngularApp']['appName'];
                    }
                    return this.sendView(req, res, 'record/edit', { oid: oid, rdmp: rdmp, recordType: recordType, appSelector: appSelector, appName: appName });
                });
            }
            else {
                RecordsService.getMeta(oid).flatMap(record => {
                    const formName = record.metaMetadata.form;
                    return FormsService.getFormByName(formName, true);
                }).subscribe(form => {
                    sails.log.debug(form);
                    if (form['customAngularApp'] != null) {
                        appSelector = form['customAngularApp']['appSelector'];
                        appName = form['customAngularApp']['appName'];
                    }
                    return this.sendView(req, res, 'record/edit', { oid: oid, rdmp: rdmp, recordType: recordType, appSelector: appSelector, appName: appName });
                }, error => {
                    return this.sendView(req, res, 'record/edit', { oid: oid, rdmp: rdmp, recordType: recordType, appSelector: appSelector, appName: appName });
                });
            }
        }
        hasEditAccess(brand, user, currentRec) {
            sails.log.verbose("Current Record: ");
            sails.log.verbose(currentRec);
            return Rx_1.Observable.of(RecordsService.hasEditAccess(brand, user, user.roles, currentRec));
        }
        hasViewAccess(brand, user, currentRec) {
            sails.log.verbose("Current Record: ");
            sails.log.verbose(currentRec);
            return Rx_1.Observable.of(RecordsService.hasViewAccess(brand, user, user.roles, currentRec));
        }
        getTransferResponsibilityConfig(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            var type = req.param('type');
            var recordTypeConfig = sails.config.recordtype;
            return this.getTransferResponsibilityConfigObject(brand, type).subscribe(transferObject => {
                return res.json(transferObject);
            });
        }
        getTransferResponsibilityConfigObject(brand, recordType) {
            return RecordTypesService.get(brand, recordType).map(recordType => {
                return recordType["transferResponsibility"];
            });
        }
        updateResponsibility(transferConfig, role, record, updateData) {
            const respConfig = transferConfig.fields[role];
            if (respConfig.updateField) {
                _.set(record, `metadata.${respConfig.updateField}`, updateData);
            }
            if (respConfig.fieldNames) {
                _.forOwn(respConfig.fieldNames, (val, key) => {
                    _.set(record, `metadata.${val}`, _.get(updateData, key));
                });
            }
            if (respConfig.updateAlso) {
                _.each(respConfig.updateAlso, (relatedRole) => {
                    record = this.updateResponsibility(transferConfig, relatedRole, record, updateData);
                });
            }
            return record;
        }
        updateResponsibilities(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const user = req.user;
            const records = req.body.records;
            const updateData = req.body.updateData;
            var role = req.body.role;
            var toEmail = updateData.email;
            var toName = updateData.text_full_name;
            let recordCtr = 0;
            if (records.length > 0) {
                let completeRecordSet = [];
                let hasError = false;
                _.forEach(records, rec => {
                    this.getRecord(rec.oid).subscribe(recObj => {
                        if (RecordsService.hasEditAccess(brand, user, user.roles, recObj)) {
                            let recType = rec.metadata.metaMetadata.type;
                            let relatedRecords = RecordsService.getRelatedRecords(rec.oid, brand);
                            relatedRecords.then(relatedRecords => {
                                let relationships = relatedRecords['processedRelationships'];
                                let relatedObjects = relatedRecords['relatedObjects'];
                                if (relationships.indexOf(recType) == -1) {
                                    relationships.push(recType);
                                    relatedObjects[recType] = [{ redboxOid: rec.oid }];
                                }
                                let relationshipCount = 0;
                                _.each(relationships, relationship => {
                                    let relationshipObjects = relatedObjects[relationship];
                                    relationshipCount++;
                                    let relationshipObjectCount = 0;
                                    _.each(relationshipObjects, relationshipObject => {
                                        const oid = relationshipObject.redboxOid;
                                        let record = null;
                                        this.getRecord(oid)
                                            .flatMap((rec) => {
                                            record = rec;
                                            return RecordTypesService.get(brand, record.metaMetadata.type);
                                        })
                                            .subscribe(recordTypeObj => {
                                            let recordType = record.metaMetadata.type;
                                            const transferConfig = recordTypeObj['transferResponsibility'];
                                            if (transferConfig) {
                                                record = this.updateResponsibility(transferConfig, role, record, updateData);
                                                sails.log.verbose(`Triggering pre-save for: ${oid}`);
                                                let observable = this.triggerPreSaveTriggers(oid, record, recordTypeObj, 'onUpdate', user);
                                                observable.then(record => {
                                                    sails.log.verbose(`Updating record ${oid}`);
                                                    sails.log.verbose(JSON.stringify(record));
                                                    RecordsService.updateMeta(brand, oid, record).subscribe(response => {
                                                        relationshipObjectCount++;
                                                        if (response && response.code == "200") {
                                                            if (oid == rec.oid) {
                                                                recordCtr++;
                                                            }
                                                            var to = toEmail;
                                                            var subject = "Ownership transfered";
                                                            var data = {};
                                                            data['record'] = record;
                                                            data['name'] = toName;
                                                            data['oid'] = oid;
                                                            EmailService.sendTemplate(to, subject, "transferOwnerTo", data);
                                                            if (relationshipCount == relationships.length && relationshipObjectCount == relationshipObjects.length) {
                                                                completeRecordSet.push({ success: true, record: record });
                                                                if (completeRecordSet.length == records.length) {
                                                                    if (hasError) {
                                                                        return this.ajaxFail(req, res, null, completeRecordSet);
                                                                    }
                                                                    else {
                                                                        return this.ajaxOk(req, res, null, completeRecordSet);
                                                                    }
                                                                }
                                                                else {
                                                                    sails.log.verbose(`Completed record set:`);
                                                                    sails.log.verbose(`${completeRecordSet.length} == ${records.length}`);
                                                                }
                                                            }
                                                            else {
                                                                sails.log.verbose(`Record counter:`);
                                                                sails.log.verbose(`${recordCtr} == ${records.length} && ${relationshipCount} == ${relationships.length} && ${relationshipObjectCount} == ${relationshipObjects.length}`);
                                                            }
                                                        }
                                                        else {
                                                            sails.log.error(`Failed to update authorization:`);
                                                            sails.log.error(response);
                                                            hasError = true;
                                                            completeRecordSet.push({ success: false, error: response, record: record });
                                                            if (completeRecordSet.length == records.length) {
                                                                if (hasError) {
                                                                    return this.ajaxFail(req, res, null, completeRecordSet);
                                                                }
                                                                else {
                                                                    return this.ajaxOk(req, res, null, completeRecordSet);
                                                                }
                                                            }
                                                        }
                                                    }, error => {
                                                        sails.log.error("Error updating auth:");
                                                        sails.log.error(error);
                                                        hasError = true;
                                                        completeRecordSet.push({ success: false, error: error.message, record: record });
                                                        if (completeRecordSet.length == records.length) {
                                                            if (hasError) {
                                                                return this.ajaxFail(req, res, null, completeRecordSet);
                                                            }
                                                            else {
                                                                return this.ajaxOk(req, res, null, completeRecordSet);
                                                            }
                                                        }
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        }
                        else {
                            const errorMsg = `Attempted to transfer responsibilities, but user: '${user.username}' has no access to record: ${rec.oid}`;
                            sails.log.error(errorMsg);
                            completeRecordSet.push({ success: false, error: errorMsg, record: rec });
                            if (completeRecordSet.length == records.length) {
                                if (hasError) {
                                    return this.ajaxFail(req, res, null, completeRecordSet);
                                }
                                else {
                                    return this.ajaxOk(req, res, null, completeRecordSet);
                                }
                            }
                        }
                    });
                });
            }
            else {
                return this.ajaxFail(req, res, 'No records specified');
            }
        }
        getForm(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const name = req.param('name');
            const oid = req.param('oid');
            const editMode = req.query.edit == "true";
            let obs = null;
            if (_.isEmpty(oid)) {
                obs = FormsService.getForm(brand.id, name, editMode, true).flatMap(form => {
                    this.mergeFields(req, res, form.fields, {});
                    return Rx_1.Observable.of(form);
                });
            }
            else {
                obs = RecordsService.getMeta(oid).flatMap(currentRec => {
                    if (_.isEmpty(currentRec)) {
                        return Rx_1.Observable.throw(new Error(`Error, empty metadata for OID: ${oid}`));
                    }
                    if (editMode) {
                        return this.hasEditAccess(brand, req.user, currentRec)
                            .flatMap(hasEditAccess => {
                            if (!hasEditAccess) {
                                return Rx_1.Observable.throw(new Error(TranslationService.t('edit-error-no-permissions')));
                            }
                            const formName = currentRec.metaMetadata.form;
                            return FormsService.getFormByName(formName, editMode).flatMap(form => {
                                if (_.isEmpty(form)) {
                                    return Rx_1.Observable.throw(new Error(`Error, getting form ${formName} for OID: ${oid}`));
                                }
                                this.mergeFields(req, res, form.fields, currentRec.metadata);
                                return Rx_1.Observable.of(form);
                            });
                        });
                    }
                    else {
                        return this.hasViewAccess(brand, req.user, currentRec)
                            .flatMap(hasViewAccess => {
                            if (!hasViewAccess) {
                                return Rx_1.Observable.throw(new Error(TranslationService.t('view-error-no-permissions')));
                            }
                            const formName = currentRec.metaMetadata.form;
                            return FormsService.getFormByName(formName, editMode).flatMap(form => {
                                if (_.isEmpty(form)) {
                                    return Rx_1.Observable.throw(new Error(`Error, getting form ${formName} for OID: ${oid}`));
                                }
                                this.mergeFields(req, res, form.fields, currentRec.metadata);
                                return Rx_1.Observable.of(form);
                            });
                        });
                    }
                });
            }
            obs.subscribe(form => {
                if (!_.isEmpty(form)) {
                    this.ajaxOk(req, res, null, form);
                }
                else {
                    this.ajaxFail(req, res, null, { message: `Failed to get form with name:${name}` });
                }
            }, error => {
                sails.log.error("Error getting form definition:");
                sails.log.error(error);
                let message = error.message;
                if (error.error && error.error.code == 500) {
                    message = TranslationService.t('missing-record');
                }
                this.ajaxFail(req, res, message);
            });
        }
        create(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const metadata = req.body;
            const user = req.user;
            let record = { metaMetadata: {} };
            var recType = req.param('recordType');
            const targetStep = req.param('targetStep');
            record.authorization = { view: [req.user.username], edit: [req.user.username] };
            record.metaMetadata.brandId = brand.id;
            record.metaMetadata.createdBy = req.user.username;
            record.metaMetadata.type = recType;
            record.metadata = metadata;
            RecordTypesService.get(brand, recType).subscribe(recordType => {
                let packageType = recordType.packageType;
                let wfStepObs = WorkflowStepsService.getFirst(recordType);
                if (targetStep) {
                    wfStepObs = WorkflowStepsService.get(recType, targetStep);
                }
                wfStepObs.subscribe(wfStep => {
                    this.updateWorkflowStep(record, wfStep);
                    let obs = this.triggerPreSaveTriggers(null, record, recordType, "onCreate", user);
                    obs.then(record => {
                        return this.createRecord(record, wfStep, brand, packageType, recordType, req, res);
                    });
                }, error => {
                    this.ajaxFail(req, res, `Failed to save record: ${error}`);
                });
            });
        }
        createRecord(record, wfStep, brand, packageType, recordType, req, res) {
            const user = req.user;
            RecordsService.create(brand, record, packageType).subscribe(response => {
                if (response && response.code == "200") {
                    response.success = true;
                    this.triggerPostSaveTriggers(response['oid'], record, recordType, 'onCreate', user);
                    this.ajaxOk(req, res, null, response);
                }
                else {
                    this.ajaxFail(req, res, null, response);
                }
            }, error => {
                return Rx_1.Observable.throw(`Failed to save record: ${error}`);
            });
        }
        triggerPostSaveTriggers(oid, record, recordType, mode = 'onUpdate', user = undefined) {
            sails.log.debug("Triggering post save triggers ");
            sails.log.debug(`hooks.${mode}.post`);
            sails.log.debug(recordType);
            let postSaveCreateHooks = _.get(recordType, `hooks.${mode}.post`, null);
            if (_.isArray(postSaveCreateHooks)) {
                _.each(postSaveCreateHooks, postSaveCreateHook => {
                    sails.log.debug(postSaveCreateHook);
                    let postSaveCreateHookFunctionString = _.get(postSaveCreateHook, "function", null);
                    if (postSaveCreateHookFunctionString != null) {
                        let postSaveCreateHookFunction = eval(postSaveCreateHookFunctionString);
                        let options = _.get(postSaveCreateHook, "options", {});
                        if (_.isFunction(postSaveCreateHookFunction)) {
                            postSaveCreateHookFunction(oid, record, options).subscribe(result => {
                                sails.log.debug(`post-save trigger ${postSaveCreateHookFunctionString} completed for ${oid}`);
                            });
                        }
                        else {
                            sails.log.error(`Post save function: '${postSaveCreateHookFunctionString}' did not resolve to a valid function, what I got:`);
                            sails.log.error(postSaveCreateHookFunction);
                        }
                    }
                });
            }
        }
        delete(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const metadata = req.body;
            const oid = req.param('oid');
            const user = req.user;
            let currentRec = null;
            let message = null;
            this.getRecord(oid).flatMap(cr => {
                currentRec = cr;
                return this.hasEditAccess(brand, user, currentRec);
            })
                .flatMap(hasEditAccess => {
                if (hasEditAccess) {
                    return RecordsService.delete(oid);
                }
                message = TranslationService.t('edit-error-no-permissions');
                return Rx_1.Observable.throw(new Error(TranslationService.t('edit-error-no-permissions')));
            })
                .subscribe(response => {
                if (response && response.code == "200") {
                    const resp = { success: true, oid: oid };
                    sails.log.verbose(`Successfully deleted: ${oid}`);
                    this.ajaxOk(req, res, null, resp);
                }
                else {
                    this.ajaxFail(req, res, TranslationService.t('failed-delete'), { success: false, oid: oid, message: response.message });
                }
            }, error => {
                sails.log.error("Error deleting:");
                sails.log.error(error);
                if (message == null) {
                    message = error.message;
                }
                else if (error.error && error.error.code == 500) {
                    message = TranslationService.t('missing-record');
                }
                this.ajaxFail(req, res, message);
            });
        }
        update(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const metadata = req.body;
            const oid = req.param('oid');
            const targetStep = req.param('targetStep');
            const user = req.user;
            let currentRec = null;
            let origRecord = null;
            const failedAttachments = [];
            let recType = null;
            this.getRecord(oid).flatMap(cr => {
                currentRec = cr;
                return this.hasEditAccess(brand, user, currentRec);
            })
                .flatMap(hasEditAccess => {
                return RecordTypesService.get(brand, currentRec.metaMetadata.type);
            }).flatMap(recordType => {
                recType = recordType;
                if (targetStep) {
                    return WorkflowStepsService.get(recType, targetStep);
                }
                else {
                    return Rx_1.Observable.of(null);
                }
            }).flatMap(nextStep => {
                if (metadata.delete) {
                    return Rx_1.Observable.of(currentRec);
                }
                this.updateWorkflowStep(currentRec, nextStep);
                origRecord = _.cloneDeep(currentRec);
                currentRec.metadata = metadata;
                let observable = this.triggerPreSaveTriggers(oid, currentRec, recType, 'onUpdate', user);
                return observable.then(record => {
                    return record;
                });
            }).subscribe(record => {
                if (metadata.delete) {
                    RecordsService.delete(oid).subscribe(response => {
                        if (response && response.code == "200") {
                            response.success = true;
                            sails.log.verbose(`Successfully deleted: ${oid}`);
                            this.ajaxOk(req, res, null, response);
                        }
                        else {
                            this.ajaxFail(req, res, TranslationService.t('failed-delete'), response);
                        }
                    }, error => {
                        sails.log.error(`Error deleting: ${oid}`);
                        sails.log.error(error);
                        this.ajaxFail(req, res, error.message);
                    });
                    return;
                }
                if (record.metadata) {
                    record = Rx_1.Observable.of(record);
                }
                record.subscribe(currentRec => {
                    return FormsService.getFormByName(currentRec.metaMetadata.form, true)
                        .flatMap(form => {
                        currentRec.metaMetadata.attachmentFields = form.attachmentFields;
                        return this.updateMetadata(brand, oid, currentRec, user.username);
                    })
                        .subscribe(response => {
                        if (response && response.code == "200") {
                            this.triggerPostSaveTriggers(response['oid'], currentRec, recType, 'onUpdate', user);
                            return this.updateDataStream(oid, origRecord, metadata, response, req, res);
                        }
                        else {
                            this.ajaxFail(req, res, null, response);
                        }
                    }, error => {
                        sails.log.error("Error updating meta:");
                        sails.log.error(error);
                        this.ajaxFail(req, res, error.message);
                    });
                });
            });
        }
        triggerPreSaveTriggers(oid, record, recordType, mode = 'onUpdate', user = undefined) {
            return __awaiter(this, void 0, void 0, function* () {
                sails.log.verbose("Triggering pre save triggers for record type: ");
                sails.log.verbose(`hooks.${mode}.pre`);
                sails.log.verbose(JSON.stringify(recordType));
                let preSaveUpdateHooks = _.get(recordType, `hooks.${mode}.pre`, null);
                sails.log.debug(preSaveUpdateHooks);
                if (_.isArray(preSaveUpdateHooks)) {
                    for (var i = 0; i < preSaveUpdateHooks.length; i++) {
                        let preSaveUpdateHook = preSaveUpdateHooks[i];
                        let preSaveUpdateHookFunctionString = _.get(preSaveUpdateHook, "function", null);
                        if (preSaveUpdateHookFunctionString != null) {
                            let preSaveUpdateHookFunction = eval(preSaveUpdateHookFunctionString);
                            let options = _.get(preSaveUpdateHook, "options", {});
                            sails.log.verbose(`Triggering pre save triggers: ${preSaveUpdateHookFunctionString}`);
                            record = yield preSaveUpdateHookFunction(oid, record, options, user).toPromise();
                        }
                    }
                }
                return record;
            });
        }
        updateDataStream(oid, origRecord, metadata, response, req, res) {
            const fileIdsAdded = [];
            RecordsService.updateDatastream(oid, origRecord, metadata, sails.config.record.attachments.stageDir, fileIdsAdded)
                .concatMap(reqs => {
                if (reqs) {
                    sails.log.verbose(`Updating data streams...`);
                    return Rx_1.Observable.from(reqs);
                }
                else {
                    sails.log.verbose(`No datastreams to update...`);
                    return Rx_1.Observable.of(null);
                }
            })
                .concatMap((promise) => {
                if (promise) {
                    sails.log.verbose(`Update datastream request is...`);
                    sails.log.verbose(JSON.stringify(promise));
                    return promise.catch(e => {
                        sails.log.verbose(`Error in updating stream::::`);
                        sails.log.verbose(JSON.stringify(e));
                        return Rx_1.Observable.of(e);
                    });
                }
                else {
                    return Rx_1.Observable.of(null);
                }
            })
                .concatMap(updateResp => {
                if (updateResp) {
                    sails.log.verbose(`Got response from update datastream request...`);
                    sails.log.verbose(JSON.stringify(updateResp));
                }
                return Rx_1.Observable.of(updateResp);
            })
                .last()
                .subscribe(whatever => {
                sails.log.verbose(`Done with updating streams and returning response...`);
                response.success = true;
                this.ajaxOk(req, res, null, response);
            }, error => {
                sails.log.error("Error updating datatreams:");
                sails.log.error(error);
                this.ajaxFail(req, res, error.message);
            });
        }
        saveMetadata(brand, oid, currentRec, metadata, user) {
            currentRec.metadata = metadata;
            return this.updateMetadata(brand, oid, currentRec, user.username);
        }
        saveAuthorization(brand, oid, currentRec, authorization, user) {
            return this.hasEditAccess(brand, user, currentRec)
                .flatMap(hasEditAccess => {
                currentRec.authorization = authorization;
                return this.updateAuthorization(brand, oid, currentRec, user.username);
            });
        }
        updateWorkflowStep(currentRec, nextStep) {
            if (!_.isEmpty(nextStep)) {
                currentRec.previousWorkflow = currentRec.workflow;
                currentRec.workflow = nextStep.config.workflow;
                currentRec.metaMetadata.form = nextStep.config.form;
                if (sails.config.jsonld.addJsonLdContext) {
                    currentRec.metadata['@context'] = sails.config.jsonld.contexts[currentRec.metaMetadata.form];
                }
                currentRec.authorization.viewRoles = nextStep.config.authorization.viewRoles;
                currentRec.authorization.editRoles = nextStep.config.authorization.editRoles;
            }
        }
        getRecord(oid) {
            return RecordsService.getMeta(oid).flatMap(currentRec => {
                if (_.isEmpty(currentRec)) {
                    return Rx_1.Observable.throw(new Error(`Failed to update meta, cannot find existing record with oid: ${oid}`));
                }
                return Rx_1.Observable.of(currentRec);
            });
        }
        updateMetadata(brand, oid, currentRec, username) {
            if (currentRec.metaMetadata.brandId != brand.id) {
                return Rx_1.Observable.throw(new Error(`Failed to update meta, brand's don't match: ${currentRec.metaMetadata.brandId} != ${brand.id}, with oid: ${oid}`));
            }
            currentRec.metaMetadata.lastSavedBy = username;
            currentRec.metaMetadata.lastSaveDate = moment_es6_1.default().format();
            sails.log.verbose(`Calling record service...`);
            sails.log.verbose(currentRec);
            return RecordsService.updateMeta(brand, oid, currentRec);
        }
        updateAuthorization(brand, oid, currentRec, username) {
            if (currentRec.metaMetadata.brandId != brand.id) {
                return Rx_1.Observable.throw(new Error(`Failed to update meta, brand's don't match: ${currentRec.metaMetadata.brandId} != ${brand.id}, with oid: ${oid}`));
            }
            return RecordsService.updateMeta(brand, oid, currentRec);
        }
        stepTo(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const metadata = req.body;
            const oid = req.param('oid');
            const targetStep = req.param('targetStep');
            let origRecord = null;
            return this.getRecord(oid).flatMap(currentRec => {
                origRecord = _.cloneDeep(currentRec);
                return this.hasEditAccess(brand, req.user, currentRec)
                    .flatMap(hasEditAccess => {
                    if (!hasEditAccess) {
                        return Rx_1.Observable.throw(new Error(TranslationService.t('edit-error-no-permissions')));
                    }
                    return RecordTypesService.get(brand, origRecord.metaMetadata.type);
                })
                    .flatMap(recType => {
                    return WorkflowStepsService.get(recType, targetStep)
                        .flatMap(nextStep => {
                        currentRec.metadata = metadata;
                        sails.log.verbose("Current rec:");
                        sails.log.verbose(currentRec);
                        sails.log.verbose("Next step:");
                        sails.log.verbose(nextStep);
                        this.updateWorkflowStep(currentRec, nextStep);
                        return this.updateMetadata(brand, oid, currentRec, req.user.username);
                    });
                });
            })
                .subscribe(response => {
                if (response && response.code == "200") {
                    response.success = true;
                    this.ajaxOk(req, res, null, response);
                }
                else {
                    this.ajaxFail(req, res, null, response);
                }
            }, error => {
                sails.log.error("Error updating meta:");
                sails.log.error(error);
                this.ajaxFail(req, res, error.message);
            });
        }
        mergeFields(req, res, fields, metadata) {
            const fieldsToDelete = [];
            _.forEach(fields, field => {
                if (_.has(metadata, field.definition.name)) {
                    field.definition.value = metadata[field.definition.name];
                }
                this.replaceCustomFields(req, res, field, metadata);
                const val = field.definition.value;
                if (field.roles) {
                    let hasAccess = false;
                    _.each(field.roles, (r) => {
                        hasAccess = RolesService.getRoleWithName(req.user.roles, r);
                        if (hasAccess)
                            return false;
                    });
                    if (!hasAccess) {
                        fieldsToDelete.push(field);
                    }
                }
                if (field.definition.fields && _.isObject(val) && !_.isString(val) && !_.isUndefined(val) && !_.isNull(val) && !_.isEmpty(val)) {
                    _.each(field.definition.fields, fld => {
                        fld.definition.value = _.get(metadata, `${field.definition.name}.${fld.definition.name}`);
                    });
                }
                else if (field.definition.fields) {
                    this.mergeFields(req, res, field.definition.fields, metadata);
                }
            });
            _.remove(fields, (f) => { return _.includes(fieldsToDelete, f); });
        }
        replaceCustomFields(req, res, field, metadata) {
            let variableSubstitutionFields = field.variableSubstitutionFields;
            if (!_.isEmpty(variableSubstitutionFields)) {
                _.forEach(variableSubstitutionFields, fieldName => {
                    _.forOwn(sails.config.record.customFields, (customConfig, customKey) => {
                        const fieldTarget = _.get(field.definition, fieldName);
                        if (!_.isEmpty(fieldTarget) && _.isString(fieldTarget) && fieldTarget.indexOf(customKey) != -1) {
                            let replacement = null;
                            if (customConfig.source == 'request') {
                                switch (customConfig.type) {
                                    case 'session':
                                        replacement = req.session[customConfig.field];
                                        break;
                                    case 'param':
                                        replacement = req.param(customConfig.field);
                                        break;
                                    case 'user':
                                        replacement = req.user[customConfig.field];
                                        break;
                                }
                            }
                            if (!_.isEmpty(replacement)) {
                                _.set(field.definition, fieldName, fieldTarget.replace(customKey, replacement));
                            }
                        }
                    });
                });
            }
        }
        modifyEditors(req, res) {
            const records = req.body.records;
            var toUsername = req.body.username;
            var toEmail = req.body.email;
            const fromUsername = req.user.username;
            const brand = BrandingService.getBrand(req.session.branding);
            const user = req.user;
            let recordCtr = 0;
            if (records.length > 0) {
                _.forEach(records, rec => {
                    const oid = rec.oid;
                    this.getRecord(oid).subscribe(record => {
                        const authorization = _.cloneDeep(record.authorization);
                        _.remove(authorization.edit, (username) => {
                            return username == fromUsername;
                        });
                        if (_.isUndefined(_.find(authorization.view, (username) => { return username == fromUsername; }))) {
                            authorization.view.push(fromUsername);
                        }
                        if (!_.isEmpty(toUsername)) {
                            if (_.isUndefined(_.find(authorization.edit, (username) => { return username == toUsername; }))) {
                                authorization.edit.push(toUsername);
                            }
                        }
                        else {
                            if (_.isUndefined(_.find(authorization.editPending, (email) => { return toEmail == email; }))) {
                                if (_.isUndefined(authorization.editPending)) {
                                    authorization.editPending = [];
                                }
                                authorization.editPending.push(toEmail);
                            }
                        }
                        this.saveAuthorization(brand, oid, record, authorization, user).subscribe(response => {
                            if (response && response.code == "200") {
                                recordCtr++;
                                if (recordCtr == records.length) {
                                    response.success = true;
                                    this.ajaxOk(req, res, null, response);
                                }
                            }
                            else {
                                sails.log.error(`Failed to update authorization:`);
                                sails.log.error(response);
                                this.ajaxFail(req, res, TranslationService.t('auth-update-error'));
                            }
                        }, error => {
                            sails.log.error("Error updating auth:");
                            sails.log.error(error);
                            this.ajaxFail(req, res, error.message);
                        });
                    });
                });
            }
            else {
                this.ajaxFail(req, res, 'No records specified');
            }
        }
        search(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const type = req.param('type');
            const workflow = req.query.workflow;
            const searchString = req.query.searchStr;
            const exactSearchNames = _.isEmpty(req.query.exactNames) ? [] : req.query.exactNames.split(',');
            const exactSearches = [];
            const facetSearchNames = _.isEmpty(req.query.facetNames) ? [] : req.query.facetNames.split(',');
            const facetSearches = [];
            _.forEach(exactSearchNames, (exactSearch) => {
                exactSearches.push({ name: exactSearch, value: req.query[`exact_${exactSearch}`] });
            });
            _.forEach(facetSearchNames, (facetSearch) => {
                facetSearches.push({ name: facetSearch, value: req.query[`facet_${facetSearch}`] });
            });
            RecordsService.searchFuzzy(type, workflow, searchString, exactSearches, facetSearches, brand, req.user, req.user.roles, sails.config.record.search.returnFields)
                .subscribe(searchRes => {
                this.ajaxOk(req, res, null, searchRes);
            }, error => {
                this.ajaxFail(req, res, error.message);
            });
        }
        getType(req, res) {
            const recordType = req.param('recordType');
            const brand = BrandingService.getBrand(req.session.branding);
            RecordTypesService.get(brand, recordType).subscribe(recordType => {
                this.ajaxOk(req, res, null, recordType);
            }, error => {
                this.ajaxFail(req, res, error.message);
            });
        }
        getAllTypes(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            RecordTypesService.getAll(brand).subscribe(recordTypes => {
                this.ajaxOk(req, res, null, recordTypes);
            }, error => {
                this.ajaxFail(req, res, error.message);
            });
        }
        initTusServer() {
            if (!this.tusServer) {
                this.tusServer = new tus.Server();
                const targetDir = sails.config.record.attachments.stageDir;
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir);
                }
                this.tusServer.datastore = new tus.FileStore({
                    path: sails.config.record.attachments.path,
                    directory: targetDir
                });
                this.tusServer.on(tus.EVENTS.EVENT_UPLOAD_COMPLETE, (event) => {
                    sails.log.verbose(`::: File uploaded to staging:`);
                    sails.log.verbose(JSON.stringify(event));
                });
                this.tusServer.on(tus.EVENTS.EVENT_FILE_CREATED, (event) => {
                    sails.log.verbose(`::: File created:`);
                    sails.log.verbose(JSON.stringify(event));
                });
            }
        }
        getTusMetadata(req, field) {
            const entries = {};
            _.each(req.headers['upload-metadata'].split(','), (entry) => {
                const elems = entry.split(' ');
                entries[elems[0]] = elems[1];
            });
            return Buffer.from(entries[field], 'base64').toString('ascii');
        }
        doAttachment(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const oid = req.param('oid');
            const attachId = req.param('attachId');
            this.initTusServer();
            const method = _.toLower(req.method);
            if (method == 'post') {
                req.baseUrl = `${sails.config.appPort ? `:${sails.config.appPort}` : ''}/${req.session.branding}/${req.session.portal}/record/${oid}`;
            }
            else {
                req.baseUrl = '';
            }
            return this.getRecord(oid).flatMap(currentRec => {
                return this.hasEditAccess(brand, req.user, currentRec).flatMap(hasEditAccess => {
                    if (!hasEditAccess) {
                        return Rx_1.Observable.throw(new Error(TranslationService.t('edit-error-no-permissions')));
                    }
                    if (method == 'get') {
                        let found = null;
                        _.each(currentRec.metaMetadata.attachmentFields, (attField) => {
                            if (!found) {
                                const attFieldVal = currentRec.metadata[attField];
                                found = _.find(attFieldVal, (attVal) => {
                                    return attVal.fileId == attachId;
                                });
                                if (found) {
                                    return false;
                                }
                            }
                        });
                        if (!found) {
                            return Rx_1.Observable.throw(new Error(TranslationService.t('attachment-not-found')));
                        }
                        res.set('Content-Type', found.mimeType);
                        res.set('Content-Disposition', `attachment; filename="${found.name}"`);
                        sails.log.verbose(`Returning datastream observable of ${oid}: ${found.name}, attachId: ${attachId}`);
                        return RecordsService.getDatastream(oid, attachId).flatMap((response) => {
                            res.end(Buffer.from(response.body), 'binary');
                            return Rx_1.Observable.of(oid);
                        });
                    }
                    else {
                        this.tusServer.handle(req, res);
                        return Rx_1.Observable.of(oid);
                    }
                });
            })
                .subscribe(whatever => {
            }, error => {
                if (this.isAjax(req)) {
                    this.ajaxFail(req, res, error.message);
                }
                else {
                    if (error.message == TranslationService.t('edit-error-no-permissions')) {
                        res.forbidden();
                    }
                    else if (error.message == TranslationService.t('attachment-not-found')) {
                        res.notFound();
                    }
                }
            });
        }
        getWorkflowSteps(req, res) {
            const recordType = req.param('recordType');
            const brand = BrandingService.getBrand(req.session.branding);
            return RecordTypesService.get(brand, recordType).subscribe(recordType => {
                return WorkflowStepsService.getAllForRecordType(recordType).subscribe(wfSteps => {
                    return this.ajaxOk(req, res, null, wfSteps);
                });
            });
        }
        getAttachments(req, res) {
            const oid = req.param('oid');
            return RecordsService.listDatastreams(oid).subscribe(datastreams => {
                let attachments = [];
                _.each(datastreams['datastreams'], datastream => {
                    let attachment = {};
                    attachment['dateUpdated'] = moment_es6_1.default(datastream['lastModified']['$date']).format();
                    attachment['label'] = datastream['label'];
                    attachment['contentType'] = datastream['contentType'];
                    attachments.push(attachment);
                });
                return this.ajaxOk(req, res, null, attachments);
            });
        }
        getDataStream(req, res) {
            const brand = BrandingService.getBrand(req.session.branding);
            const oid = req.param('oid');
            const datastreamId = req.param('datastreamId');
            return this.getRecord(oid).flatMap(currentRec => {
                return this.hasEditAccess(brand, req.user, currentRec).flatMap(hasEditAccess => {
                    if (!hasEditAccess) {
                        return Rx_1.Observable.throw(new Error(TranslationService.t('edit-error-no-permissions')));
                    }
                    else {
                        const fileName = req.param('fileName') ? req.param('fileName') : datastreamId;
                        res.set('Content-Type', 'application/octet-stream');
                        res.set('Content-Disposition', `attachment; filename="${fileName}"`);
                        sails.log.verbose(`Returning datastream observable of ${oid}: ${fileName}, datastreamId: ${datastreamId}`);
                        return RecordsService.getDatastream(oid, datastreamId).flatMap((response) => {
                            res.end(Buffer.from(response.body), 'binary');
                            return Rx_1.Observable.of(oid);
                        });
                    }
                });
            }).subscribe(whatever => {
            }, error => {
                if (this.isAjax(req)) {
                    this.ajaxFail(req, res, error.message);
                }
                else {
                    if (error.message == TranslationService.t('edit-error-no-permissions')) {
                        res.forbidden();
                    }
                    else if (error.message == TranslationService.t('attachment-not-found')) {
                        res.notFound();
                    }
                }
            });
        }
    }
    Controllers.Record = Record;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Record().exports();
