"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Email extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'sendNotification'
            ];
        }
        sendNotification(req, res) {
            if (!req.body.to) {
                sails.log.error("No email recipient in email notification request!");
                return;
            }
            if (!req.body.template) {
                sails.log.error("No template specified in email notification request!");
                return;
            }
            var to = req.body.to;
            var template = req.body.template;
            var subject;
            if (req.body.subject) {
                subject = req.body.subject;
            }
            else {
                subject = sails.config.emailnotification.templates[template].subject;
            }
            var data = {};
            if (req.body.data) {
                data = req.body.data;
            }
            var buildResponse = EmailService.buildFromTemplate(template, data);
            buildResponse.subscribe(buildResult => {
                if (buildResult['status'] != 200) {
                    this.ajaxFail(req, res, buildResult['msg']);
                }
                else {
                    var sendResponse = EmailService.sendMessage(to, buildResult['body'], subject);
                    sendResponse.subscribe(sendResult => {
                        if (sendResult['code'] != 200) {
                            this.ajaxFail(req, res, sendResult['msg']);
                        }
                        else {
                            this.ajaxOk(req, res, sendResult['msg']);
                        }
                    });
                }
            });
        }
    }
    Controllers.Email = Email;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Email().exports();
