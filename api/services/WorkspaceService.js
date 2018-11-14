"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const request = require("request-promise");
var Services;
(function (Services) {
    class WorkspaceService extends services.Services.Core.Service {
        constructor() {
            super();
            this._exportedMethods = [
                'createWorkspaceRecord',
                'getRecordMeta',
                'updateRecordMeta',
                'registerUserApp',
                'userInfo',
                'provisionerUser',
                'getCookies',
                'getCookieValue',
                'cookieJar',
                'infoFormUserId',
                'createWorkspaceInfo',
                'updateWorkspaceInfo',
                'workspaceAppFromUserId',
                'removeAppFromUserId',
                'mapToRecord'
            ];
        }
        getCookies(cookies) {
            const cookieJar = [];
            cookies.forEach((rawcookies) => {
                var cookie = request.cookie(rawcookies);
                cookieJar.push({ key: cookie.key, value: cookie.value, expires: cookie.expires });
            });
            return cookieJar;
        }
        getCookieValue(cookieJar, key) {
            const cookie = _.findWhere(cookieJar, { key: key });
            if (cookie) {
                return cookie.value;
            }
            else
                return '';
        }
        cookieJar(jar, config, key, value) {
            const keyvalue = key + '=' + value;
            const cookie = request.cookie('' + keyvalue);
            jar.setCookie(cookie, config.host, function (error, cookie) {
                sails.log.debug(cookie);
            });
            return jar;
        }
        mapToRecord(obj, recordMap) {
            let newObj = {};
            _.each(recordMap, (value) => {
                newObj[value.record] = _.get(obj, value.ele);
            });
            return newObj;
        }
        createWorkspaceRecord(config, username, project, recordType, workflowStage) {
            sails.log.debug(config);
            const post = request({
                uri: config.brandingAndPortalUrl + `/api/records/metadata/${recordType}`,
                method: 'POST',
                body: {
                    authorization: {
                        edit: [username],
                        view: [username],
                        editPending: [],
                        viewPending: []
                    },
                    metadata: project,
                    workflowStage: workflowStage
                },
                json: true,
                headers: config.redboxHeaders
            });
            return Rx_1.Observable.fromPromise(post);
        }
        getRecordMeta(config, rdmp) {
            const get = request({
                uri: config.brandingAndPortalUrl + '/api/records/metadata/' + rdmp,
                json: true,
                headers: config.redboxHeaders
            });
            return Rx_1.Observable.fromPromise(get);
        }
        updateRecordMeta(config, record, id) {
            const post = request({
                uri: config.brandingAndPortalUrl + '/api/records/metadata/' + id,
                method: 'PUT',
                body: record,
                json: true,
                headers: config.redboxHeaders
            });
            return Rx_1.Observable.fromPromise(post);
        }
        userInfo(userId) {
            return super.getObservable(User.findOne({ id: userId }));
        }
        provisionerUser(username) {
            return super.getObservable(User.findOne({ username: username }));
        }
        infoFormUserId(userId) {
            return this.getObservable(User.findOne({ id: userId }).populate('workspaceApps'));
        }
        createWorkspaceInfo(userId, appName, info) {
            return this.getObservable(WorkspaceApp.findOrCreate({ app: appName, user: userId }, { app: appName, user: userId, info: info }));
        }
        updateWorkspaceInfo(id, info) {
            return this.getObservable(WorkspaceApp.update({ id: id }, { info: info }));
        }
        workspaceAppFromUserId(userId, appName) {
            return this.getObservable(WorkspaceApp.findOne({ app: appName, user: userId }));
        }
        removeAppFromUserId(userId, id) {
            return this.getObservable(WorkspaceApp.destroy({ id: id, user: userId }));
        }
    }
    Services.WorkspaceService = WorkspaceService;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.WorkspaceService().exports();
