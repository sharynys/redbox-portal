"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services = require("../core/CoreService.js");
const util = require('util');
const moment = require('moment');
var Services;
(function (Services) {
    class WorkspaceAsyncService extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'start',
                'update',
                'pending',
                'loop'
            ];
        }
        start({ name, recordType, username, service: service, method, args }) {
            return super.getObservable(WorkspaceAsync.create({ name: name, started_by: username, recordType: recordType,
                method: method, args: args, status: 'started' }));
        }
        update(id, obj) {
            if (obj.status === 'finished') {
                obj.date_completed = moment().format('YYYY-MM-DD HH:mm:ss');
            }
            return super.getObservable(WorkspaceAsync.update({ id: id }, obj));
        }
        pending() {
            return super.getObservable(WorkspaceAsync.find({ status: 'pending' }));
        }
        loop() {
            sails.log.verbose('::::LOOP PENDING STATE::::::');
            this.pending().subscribe(pending => {
                _.forEach(pending, wa => {
                    const args = wa.args || null;
                    sails.services[wa.service][wa.method]({ args }).subscribe(message => {
                        this.update(wa.id, { status: 'finished', message: message }).subscribe();
                    }, error => {
                        this.update(wa.id, { status: 'error', message: error }).subscribe();
                    });
                });
            }, error => {
                sails.log.error(error);
            });
        }
    }
    Services.WorkspaceAsyncService = WorkspaceAsyncService;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.WorkspaceAsyncService().exports();
