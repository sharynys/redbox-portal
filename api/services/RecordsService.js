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
const services = require("../core/CoreService.js");
const request = require("request-promise");
const luceneEscapeQuery = require("lucene-escape-query");
const fs = require("fs");
const moment_es6_1 = require("moment-es6");
const util = require('util');
var Services;
(function (Services) {
    class Records extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'create',
                'updateMeta',
                'getMeta',
                'hasEditAccess',
                'hasViewAccess',
                'getOne',
                'search',
                'createBatch',
                'provideUserAccessAndRemovePendingAccess',
                'searchFuzzy',
                'addDatastream',
                'removeDatastream',
                'updateDatastream',
                'getDatastream',
                'listDatastreams',
                'deleteFilesFromStageDir',
                'getRelatedRecords',
                'delete',
                'updateNotificationLog'
            ];
        }
        create(brand, record, packageType, formName = sails.config.form.defaultForm) {
            const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.create.url, null, packageType);
            options.body = record;
            sails.log.verbose(util.inspect(options, { showHidden: false, depth: null }));
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.create.method](options));
        }
        delete(oid) {
            const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.delete.url, oid);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.delete.method](options));
        }
        updateMeta(brand, oid, record) {
            const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.updateMeta.url, oid);
            options.body = record;
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.updateMeta.method](options));
        }
        getMeta(oid) {
            const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.getMeta.url, oid);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.getMeta.method](options));
        }
        updateDatastream(oid, record, newMetadata, fileRoot, fileIdsAdded) {
            return FormsService.getFormByName(record.metaMetadata.form, true).flatMap(form => {
                const reqs = [];
                record.metaMetadata.attachmentFields = form.attachmentFields;
                _.each(form.attachmentFields, (attField) => {
                    const oldAttachments = record.metadata[attField];
                    const newAttachments = newMetadata[attField];
                    const removeIds = [];
                    if (!_.isUndefined(oldAttachments) && !_.isNull(oldAttachments) && !_.isNull(newAttachments)) {
                        const toRemove = _.differenceBy(oldAttachments, newAttachments, 'fileId');
                        _.each(toRemove, (removeAtt) => {
                            if (removeAtt.type == 'attachment') {
                                removeIds.push(removeAtt.fileId);
                            }
                        });
                    }
                    if (!_.isUndefined(newAttachments) && !_.isNull(newAttachments)) {
                        const toAdd = _.differenceBy(newAttachments, oldAttachments, 'fileId');
                        _.each(toAdd, (addAtt) => {
                            if (addAtt.type == 'attachment') {
                                fileIdsAdded.push(addAtt.fileId);
                            }
                        });
                    }
                    const req = this.addAndRemoveDatastreams(oid, fileIdsAdded, removeIds);
                    if (req) {
                        reqs.push(req);
                    }
                });
                if (!_.isEmpty(reqs)) {
                    return Rx_1.Observable.of(reqs);
                }
                else {
                    return Rx_1.Observable.of(null);
                }
            });
        }
        removeDatastream(oid, fileId) {
            const apiConfig = sails.config.record.api.removeDatastream;
            const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
            opts.url = `${opts.url}?skipReindex=true&datastreamId=${fileId}`;
            return request[apiConfig.method](opts);
        }
        addDatastream(oid, fileId) {
            const apiConfig = sails.config.record.api.addDatastream;
            const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
            opts.url = `${opts.url}?skipReindex=true&datastreamId=${fileId}`;
            const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;
            opts['formData'] = {
                content: fs.createReadStream(fpath)
            };
            return request[apiConfig.method](opts);
        }
        addAndRemoveDatastreams(oid, addIds, removeIds) {
            const apiConfig = sails.config.record.api.addAndRemoveDatastreams;
            const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
            opts.url = `${opts.url}?skipReindex=false`;
            if (!_.isEmpty(removeIds)) {
                const removeDataStreamIds = removeIds.join(',');
                opts.url = `${opts.url}&removePayloadIds=${removeDataStreamIds}`;
            }
            if (!_.isEmpty(addIds)) {
                const formData = {};
                _.each(addIds, fileId => {
                    const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;
                    formData[fileId] = fs.createReadStream(fpath);
                });
                opts['formData'] = formData;
                opts.json = false;
                opts.headers['Content-Type'] = 'application/octet-stream';
            }
            if (_.size(addIds) > 0 || _.size(removeIds) > 0) {
                return request[apiConfig.method](opts);
            }
        }
        addDatastreams(oid, fileIds) {
            const apiConfig = sails.config.record.api.addDatastreams;
            const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
            opts.url = `${opts.url}?skipReindex=false&datastreamIds=${fileIds.join(',')}`;
            const formData = {};
            _.each(fileIds, fileId => {
                const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;
                formData[fileId] = fs.createReadStream(fpath);
            });
            opts['formData'] = formData;
            return request[apiConfig.method](opts);
        }
        getDatastream(oid, fileId) {
            const apiConfig = sails.config.record.api.getDatastream;
            const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid, null, false);
            opts.url = `${opts.url}?datastreamId=${fileId}`;
            opts.headers['Content-Type'] = 'application/octet-stream';
            opts.headers['accept'] = 'application/octet-stream';
            opts.resolveWithFullResponse = true;
            opts.timeout = apiConfig.readTimeout;
            sails.log.verbose(`Getting datastream using: `);
            sails.log.verbose(JSON.stringify(opts));
            return Rx_1.Observable.fromPromise(request[apiConfig.method](opts));
        }
        listDatastreams(oid, fileId) {
            const apiConfig = sails.config.record.api.listDatastreams;
            const opts = this.getOptions(`${sails.config.record.baseUrl.redbox}${apiConfig.url}`, oid);
            return Rx_1.Observable.fromPromise(request[apiConfig.method](opts));
        }
        deleteFilesFromStageDir(stageDir, fileIds) {
            _.each(fileIds, fileId => {
                const path = `${stageDir}/${fileId}`;
                fs.unlinkSync(path);
            });
        }
        getOptions(url, oid = null, packageType = null, isJson = true) {
            if (!_.isEmpty(oid)) {
                url = url.replace('$oid', oid);
            }
            if (!_.isEmpty(packageType)) {
                url = url.replace('$packageType', packageType);
            }
            const opts = { url: url, headers: { 'Authorization': `Bearer ${sails.config.redbox.apiKey}` } };
            if (isJson == true) {
                opts.json = true;
                opts.headers['Content-Type'] = 'application/json; charset=utf-8';
            }
            else {
                opts.encoding = null;
            }
            return opts;
        }
        hasViewAccess(brand, user, roles, record) {
            const viewArr = record.authorization ? _.union(record.authorization.view, record.authorization.edit) : _.union(record.authorization_view, record.authorization_edit);
            const viewRolesArr = record.authorization ? _.union(record.authorization.viewRoles, record.authorization.editRoles) : _.union(record.authorization_viewRoles, record.authorization_editRoles);
            const uname = user.username;
            const isInUserView = _.find(viewArr, username => {
                return uname == username;
            });
            if (!_.isUndefined(isInUserView)) {
                return true;
            }
            const isInRoleView = _.find(viewRolesArr, roleName => {
                const role = RolesService.getRole(brand, roleName);
                return role && !_.isUndefined(_.find(roles, r => {
                    return role.id == r.id;
                }));
            });
            return !_.isUndefined(isInRoleView);
        }
        hasEditAccess(brand, user, roles, record) {
            const editArr = record.authorization ? record.authorization.edit : record.authorization_edit;
            const editRolesArr = record.authorization ? record.authorization.editRoles : record.authorization_editRoles;
            const uname = user.username;
            const isInUserEdit = _.find(editArr, username => {
                sails.log.verbose(`Username: ${uname} == ${username}`);
                return uname == username;
            });
            sails.log.verbose(`isInUserEdit: ${isInUserEdit}`);
            if (!_.isUndefined(isInUserEdit)) {
                return true;
            }
            const isInRoleEdit = _.find(editRolesArr, roleName => {
                const role = RolesService.getRole(brand, roleName);
                return role && !_.isUndefined(_.find(roles, r => {
                    return role.id == r.id;
                }));
            });
            return !_.isUndefined(isInRoleEdit);
        }
        createBatch(type, data, harvestIdFldName) {
            const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.harvest.url, null, type);
            data = _.map(data, dataItem => {
                return { harvest_id: _.get(dataItem, harvestIdFldName, ''), metadata: { metadata: dataItem, metaMetadata: { type: type } } };
            });
            options.body = { records: data };
            sails.log.verbose(`Sending data:`);
            sails.log.verbose(options.body);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.harvest.method](options));
        }
        search(type, searchField, searchStr, returnFields) {
            const url = `${this.getSearchTypeUrl(type, searchField, searchStr)}&start=0&rows=${sails.config.record.export.maxRecords}`;
            sails.log.verbose(`Searching using: ${url}`);
            const options = this.getOptions(url);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options))
                .flatMap(resp => {
                let response = resp;
                const customResp = [];
                _.forEach(response.response.docs, solrdoc => {
                    const customDoc = {};
                    _.forEach(returnFields, retField => {
                        customDoc[retField] = solrdoc[retField][0];
                    });
                    customResp.push(customDoc);
                });
                return Rx_1.Observable.of(customResp);
            });
        }
        searchFuzzy(type, workflowState, searchQuery, exactSearches, facetSearches, brand, user, roles, returnFields) {
            const username = user.username;
            let searchParam = workflowState ? ` AND workflow_stage:${workflowState} ` : '';
            searchParam = `${searchParam} AND full_text:${searchQuery}`;
            _.forEach(exactSearches, (exactSearch) => {
                searchParam = `${searchParam}&fq=${exactSearch.name}:${this.luceneEscape(exactSearch.value)}`;
            });
            if (facetSearches.length > 0) {
                searchParam = `${searchParam}&facet=true`;
                _.forEach(facetSearches, (facetSearch) => {
                    searchParam = `${searchParam}&facet.field=${facetSearch.name}${_.isEmpty(facetSearch.value) ? '' : `&fq=${facetSearch.name}:${this.luceneEscape(facetSearch.value)}`}`;
                });
            }
            let url = `${sails.config.record.baseUrl.redbox}${sails.config.record.api.search.url}?q=metaMetadata_brandId:${brand.id} AND metaMetadata_type:${type}${searchParam}&version=2.2&wt=json&sort=date_object_modified desc`;
            url = this.addAuthFilter(url, username, roles, brand, false);
            sails.log.verbose(`Searching fuzzy using: ${url}`);
            const options = this.getOptions(url);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options))
                .flatMap(resp => {
                let response = resp;
                const customResp = { records: [] };
                _.forEach(response.response.docs, solrdoc => {
                    const customDoc = {};
                    _.forEach(returnFields, retField => {
                        if (_.isArray(solrdoc[retField])) {
                            customDoc[retField] = solrdoc[retField][0];
                        }
                        else {
                            customDoc[retField] = solrdoc[retField];
                        }
                    });
                    customDoc["hasEditAccess"] = this.hasEditAccess(brand, user, roles, solrdoc);
                    customResp.records.push(customDoc);
                });
                if (response.facet_counts) {
                    customResp['facets'] = [];
                    _.forOwn(response.facet_counts.facet_fields, (facet_field, facet_name) => {
                        const numFacetsValues = _.size(facet_field) / 2;
                        const facetValues = [];
                        for (var i = 0, j = 0; i < numFacetsValues; i++) {
                            facetValues.push({
                                value: facet_field[j++],
                                count: facet_field[j++]
                            });
                        }
                        customResp['facets'].push({ name: facet_name, values: facetValues });
                    });
                }
                return Rx_1.Observable.of(customResp);
            });
        }
        addAuthFilter(url, username, roles, brand, editAccessOnly = undefined) {
            var roleString = "";
            var matched = false;
            for (var i = 0; i < roles.length; i++) {
                var role = roles[i];
                if (role.branding == brand.id) {
                    if (matched) {
                        roleString += " OR ";
                        matched = false;
                    }
                    roleString += roles[i].name;
                    matched = true;
                }
            }
            url = url + "&fq=authorization_edit:" + username + (editAccessOnly ? "" : (" OR authorization_view:" + username + " OR authorization_viewRoles:(" + roleString + ")")) + " OR authorization_editRoles:(" + roleString + ")";
            return url;
        }
        getOne(type) {
            const url = `${this.getSearchTypeUrl(type)}&start=0&rows=1`;
            sails.log.verbose(`Getting one using url: ${url}`);
            const options = this.getOptions(url);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options))
                .flatMap(response => {
                let resp = response;
                return Rx_1.Observable.of(resp.response.docs);
            });
        }
        getSearchTypeUrl(type, searchField = null, searchStr = null) {
            const searchParam = searchField ? ` AND ${searchField}:${searchStr}*` : '';
            return `${sails.config.record.baseUrl.redbox}${sails.config.record.api.search.url}?q=metaMetadata_type:${type}${searchParam}&version=2.2&wt=json&sort=date_object_modified desc`;
        }
        provideUserAccessAndRemovePendingAccess(oid, userid, pendingValue) {
            var metadataResponse = this.getMeta(oid);
            metadataResponse.subscribe(metadata => {
                var pendingEditArray = metadata['authorization']['editPending'];
                var editArray = metadata['authorization']['edit'];
                for (var i = 0; i < pendingEditArray.length; i++) {
                    if (pendingEditArray[i] == pendingValue) {
                        pendingEditArray = pendingEditArray.filter(e => e !== pendingValue);
                        editArray = editArray.filter(e => e !== userid);
                        editArray.push(userid);
                    }
                }
                metadata['authorization']['editPending'] = pendingEditArray;
                metadata['authorization']['edit'] = editArray;
                var pendingViewArray = metadata['authorization']['viewPending'];
                var viewArray = metadata['authorization']['view'];
                for (var i = 0; i < pendingViewArray.length; i++) {
                    if (pendingViewArray[i] == pendingValue) {
                        pendingViewArray = pendingViewArray.filter(e => e !== pendingValue);
                        viewArray = viewArray.filter(e => e !== userid);
                        viewArray.push(userid);
                    }
                }
                metadata['authorization']['viewPending'] = pendingViewArray;
                metadata['authorization']['view'] = viewArray;
                this.updateMeta(null, oid, metadata);
            });
        }
        luceneEscape(str) {
            return luceneEscapeQuery.escape(str);
        }
        getRelatedRecordsInternal(oid, recordTypeName, brand, mappingContext) {
            return __awaiter(this, void 0, void 0, function* () {
                sails.log.debug("Getting related Records for oid: " + oid);
                let record = yield this.getMeta(oid).toPromise();
                let recordType = yield RecordTypesService.get(brand, recordTypeName).toPromise();
                let relationships = [];
                let processedRelationships = [];
                processedRelationships.push(recordType.name);
                let relatedTo = recordType['relatedTo'];
                if (_.isArray(relatedTo)) {
                    _.each(relatedTo, relatedObject => {
                        relationships.push({
                            collection: relatedObject['recordType'],
                            foreignField: relatedObject['foreignField'],
                            localField: relatedObject['localField']
                        });
                    });
                    const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.getRecordRelationships.url, oid);
                    options.body = {
                        oid: oid,
                        relationships: relationships
                    };
                    let relatedRecords = yield request[sails.config.record.api.updateMeta.method](options);
                    for (let i = 0; i < relationships.length; i++) {
                        let relationship = relationships[i];
                        let collectionName = relationship['collection'];
                        let recordRelationships = relatedRecords[collectionName];
                        let newRelatedObjects = {};
                        newRelatedObjects[collectionName] = recordRelationships;
                        _.merge(mappingContext, { relatedObjects: newRelatedObjects });
                        if (_.indexOf(mappingContext['processedRelationships'], collectionName) < 0) {
                            mappingContext['processedRelationships'].push(collectionName);
                            for (let j = 0; j < recordRelationships.length; j++) {
                                let recordRelationship = recordRelationships[j];
                                mappingContext = yield this.getRelatedRecordsInternal(recordRelationship.redboxOid, collectionName, brand, mappingContext);
                            }
                        }
                    }
                }
                return mappingContext;
            });
        }
        getRelatedRecords(oid, brand) {
            return __awaiter(this, void 0, void 0, function* () {
                let record = yield this.getMeta(oid).toPromise();
                let recordTypeName = record['metaMetadata']['type'];
                let recordType = yield RecordTypesService.get(brand, recordTypeName).toPromise();
                let mappingContext = { 'processedRelationships': [], 'relatedObjects': {} };
                let relationships = [];
                let processedRelationships = [];
                processedRelationships.push(recordType.name);
                let relatedTo = recordType['relatedTo'];
                if (_.isArray(relatedTo)) {
                    _.each(relatedTo, relatedObject => {
                        relationships.push({
                            collection: relatedObject['recordType'],
                            foreignField: relatedObject['foreignField'],
                            localField: relatedObject['localField']
                        });
                    });
                    const options = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.getRecordRelationships.url, oid);
                    options.body = {
                        oid: oid,
                        relationships: relationships
                    };
                    let relatedRecords = yield request[sails.config.record.api.updateMeta.method](options);
                    for (let i = 0; i < relationships.length; i++) {
                        let relationship = relationships[i];
                        let collectionName = relationship['collection'];
                        let recordRelationships = relatedRecords[collectionName];
                        let newRelatedObjects = {};
                        mappingContext['processedRelationships'].push(collectionName);
                        newRelatedObjects[collectionName] = recordRelationships;
                        _.merge(mappingContext, { relatedObjects: newRelatedObjects });
                        for (let j = 0; j < recordRelationships.length; j++) {
                            let recordRelationship = recordRelationships[j];
                            mappingContext = yield this.getRelatedRecordsInternal(recordRelationship.redboxOid, collectionName, brand, mappingContext);
                        }
                    }
                    return mappingContext;
                }
                else {
                    return {};
                }
            });
        }
        updateNotificationLog(oid, record, options) {
            if (this.metTriggerCondition(oid, record, options) == "true") {
                sails.log.verbose(`Updating notification log for oid: ${oid}`);
                const logName = _.get(options, 'logName', null);
                if (logName) {
                    let log = _.get(record, logName, null);
                    const entry = { date: moment_es6_1.default().format('YYYY-MM-DDTHH:mm:ss') };
                    if (log) {
                        log.push(entry);
                    }
                    else {
                        log = [entry];
                    }
                    _.set(record, logName, log);
                }
                const updateFlagName = _.get(options, 'flagName', null);
                if (updateFlagName) {
                    _.set(record, updateFlagName, _.get(options, 'flagVal', null));
                }
                sails.log.verbose(`======== Notification log updates =========`);
                sails.log.verbose(JSON.stringify(record));
                sails.log.verbose(`======== End update =========`);
                if (_.get(options, "saveRecord", false)) {
                    const updateOptions = this.getOptions(sails.config.record.baseUrl.redbox + sails.config.record.api.updateMeta.url, oid);
                    updateOptions.body = record;
                    return Rx_1.Observable.fromPromise(request[sails.config.record.api.updateMeta.method](updateOptions))
                        .flatMap(resp => {
                        let response = resp;
                        if (response && response.code != "200") {
                            sails.log.error(`Error updating notification log: ${oid}`);
                            sails.log.error(JSON.stringify(response));
                            return Rx_1.Observable.throw(new Error('Failed to update notification log'));
                        }
                        return Rx_1.Observable.of(record);
                    });
                }
            }
            else {
                sails.log.verbose(`Notification log name: '${options.name}', for oid: ${oid}, not running, condition not met: ${options.triggerCondition}`);
                sails.log.verbose(JSON.stringify(record));
            }
            return Rx_1.Observable.of(record);
        }
    }
    Services.Records = Records;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Records().exports();
