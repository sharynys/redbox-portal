"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Asynch extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'index',
                'start',
                'progress',
                'stop',
                'update',
                'subscribe',
                'unsubscribe'
            ];
        }
        index(req, res) {
            return this.sendView(req, res, 'asynch/index');
        }
        start(req, res) {
            const progressObj = this.createProgressObjFromRequest(req);
            AsynchsService.start(progressObj).subscribe(progress => {
                this.broadcast(req, 'start', progress);
                this.ajaxOk(req, res, null, progress, true);
            });
        }
        stop(req, res) {
            const id = req.param('id');
            AsynchsService.finish(id).subscribe(progress => {
                this.broadcast(req, 'stop', progress[0]);
                this.ajaxOk(req, res, null, progress[0], true);
            });
        }
        update(req, res) {
            const id = req.param('id');
            const progressObj = this.createProgressObjFromRequest(req);
            AsynchsService.update({ id: id }, progressObj).subscribe(progress => {
                this.broadcast(req, 'update', progress[0]);
                this.ajaxOk(req, res, null, progress[0], true);
            });
        }
        createProgressObjFromRequest(req) {
            const brand = BrandingService.getBrand(req.session.branding);
            const username = req.user.username;
            const name = req.param('name');
            const recordOid = req.param('relatedRecordId');
            const metadata = req.param('metadata') ? req.param('metadata') : null;
            const method = req.method;
            const status = req.param('status');
            const progressObj = {
                name: name,
                started_by: username,
                branding: brand.id,
                status: status,
                metadata: metadata,
                relatedRecordId: recordOid,
                message: req.param('message'),
                taskType: req.param('taskType')
            };
            if (!_.isUndefined(req.param('targetIdx'))) {
                progressObj.targetIdx = req.param('targetIdx');
            }
            if (!_.isUndefined(req.param('currentIdx'))) {
                progressObj.currentIdx = req.param('currentIdx');
            }
            return progressObj;
        }
        progress(req, res) {
            const fq = this.getQuery(req.param('fq'));
            if (_.isEmpty(fq)) {
                return this.ajaxFail(req, res, 'Empty queries are not allowed.');
            }
            const brand = BrandingService.getBrand(req.session.branding);
            fq.where.branding = brand.id;
            AsynchsService.get(fq).subscribe(progress => {
                this.ajaxOk(req, res, null, progress, true);
            });
        }
        getQuery(fq) {
            if (_.isString(fq)) {
                fq = JSON.parse(fq);
            }
            _.unset(fq, '$where');
            _.unset(fq, 'group');
            _.unset(fq, 'mapReduce');
            return fq;
        }
        subscribe(req, res) {
            const roomId = req.param('roomId');
            console.log(`Trying to join: ${roomId}`);
            if (!req.isSocket) {
                return res.badRequest();
            }
            sails.sockets.join(req, roomId, (err) => {
                if (err) {
                    console.log(`Failed to join room`);
                    return this.ajaxFail(req, res, `Failed to join room: ${roomId}`, err, true);
                }
                console.log(`Joined room: ${roomId}`);
                return this.ajaxOk(req, res, null, {
                    status: true,
                    message: `Successfully joined: ${roomId}`
                }, true);
            });
        }
        unsubscribe(req, res) {
            if (!req.isSocket) {
                return res.badRequest();
            }
            const roomId = req.param('roomId');
            sails.sockets.leave(req, roomId, (err) => {
                if (err) {
                    return this.ajaxFail(req, res, `Failed to leave room: ${roomId}`, err, true);
                }
                return this.ajaxOk(req, res, null, {
                    status: true,
                    message: `Successfully left: ${roomId}`
                }, true);
            });
        }
        broadcast(req, eventName, progressObj) {
            if (!_.isEmpty(progressObj.relatedRecordId) && !_.isUndefined(progressObj.relatedRecordId)) {
                sails.sockets.broadcast(progressObj.relatedRecordId, eventName, progressObj, req);
                sails.sockets.broadcast(progressObj.id, eventName, progressObj, req);
                if (progressObj.taskType) {
                    sails.sockets.broadcast(`${progressObj.relatedRecordId}-${progressObj.taskType}`, eventName, progressObj, req);
                }
            }
        }
    }
    Controllers.Asynch = Asynch;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Asynch().exports();
