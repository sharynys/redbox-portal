"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
require("rxjs/add/operator/toPromise");
const request = require("request-promise");
const ejs = require("ejs");
const fs = require("graceful-fs");
var Services;
(function (Services) {
    class Email extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'sendMessage',
                'buildFromTemplate',
                'sendTemplate',
                'sendRecordNotification'
            ];
        }
        sendMessage(msgTo, msgBody, msgSubject = sails.config.emailnotification.defaults.subject, msgFrom = sails.config.emailnotification.defaults.from, msgFormat = sails.config.emailnotification.defaults.format) {
            if (!sails.config.emailnotification.settings.enabled) {
                sails.log.verbose("Received email notification request, but is disabled. Ignoring.");
                return Rx_1.Observable.of({ 'code': '200', 'msg': 'Email services disabled.' });
            }
            sails.log.verbose('Received email notification request. Processing.');
            var url = `${sails.config.record.baseUrl.redbox}${sails.config.emailnotification.api.send.url}`;
            var body = {
                "to": msgTo,
                "subject": msgSubject,
                "body": msgBody,
                "from": msgFrom,
                "format": msgFormat
            };
            sails.log.verbose("Body: ");
            sails.log.verbose(body);
            var options = { url: url, json: true, body: body, headers: { 'Authorization': `Bearer ${sails.config.redbox.apiKey}`, 'Content-Type': 'application/json; charset=utf-8' } };
            var response = Rx_1.Observable.fromPromise(request[sails.config.emailnotification.api.send.method](options)).catch(error => Rx_1.Observable.of(`Error: ${error}`));
            return response.map(result => {
                if (result['code'] != '200') {
                    sails.log.error(`Unable to post message to message queue: ${result}`);
                    result['msg'] = 'Email unable to be submitted';
                }
                else {
                    sails.log.verbose('Message submitted to message queue successfully');
                    result['msg'] = 'Email sent!';
                }
                return result;
            });
        }
        buildFromTemplate(template, data = {}) {
            let readFileAsObservable = Rx_1.Observable.bindNodeCallback((path, encoding, callback) => fs.readFile(path, encoding, callback));
            let res = {};
            let readTemplate = readFileAsObservable(sails.config.emailnotification.settings.templateDir + template + '.ejs', 'utf8');
            return readTemplate.map(buffer => {
                try {
                    var renderedTemplate = ejs.render((buffer || "").toString(), data, { cache: true, filename: template });
                }
                catch (e) {
                    sails.log.error(`Unable to render template ${template} with data: ${data}`);
                    res['status'] = 500;
                    res['body'] = 'Templating error.';
                    res['ex'] = e;
                    return res;
                }
                res['status'] = 200;
                res['body'] = renderedTemplate;
                return res;
            }, error => {
                sails.log.error(`Unable to read template file for ${template}`);
                res['status'] = 500;
                res['body'] = 'Template read error.';
                res['ex'] = error;
                return res;
            });
        }
        sendTemplate(to, subject, template, data) {
            sails.log.verbose("Inside Send Template");
            var buildResponse = this.buildFromTemplate(template, data);
            sails.log.verbose("buildResponse");
            buildResponse.subscribe(buildResult => {
                if (buildResult['status'] != 200) {
                    return buildResult;
                }
                else {
                    var sendResponse = this.sendMessage(to, buildResult['body'], subject);
                    sendResponse.subscribe(sendResult => {
                        return sendResult;
                    });
                }
            });
        }
        runTemplate(template, variables) {
            if (template && template.indexOf('<%') != -1) {
                return _.template(template, variables)();
            }
            return template;
        }
        sendRecordNotification(oid, record, options) {
            if (this.metTriggerCondition(oid, record, options) == "true") {
                const variables = { imports: {
                        record: record,
                        oid: oid
                    } };
                sails.log.verbose(`Sending record notification for oid: ${oid}`);
                sails.log.verbose(options);
                const to = this.runTemplate(_.get(options, "to", null), variables);
                if (!to) {
                    sails.log.error(`Error sending notification for oid: ${oid}, invalid 'To' address: ${to}. Please check your configuration 'to' option: ${_.get(options, 'to')}`);
                    return Rx_1.Observable.of(null);
                }
                const subject = this.runTemplate(_.get(options, "subject", null), variables);
                const templateName = _.get(options, "template", "");
                const data = {};
                data['record'] = record;
                data['oid'] = oid;
                return this.buildFromTemplate(templateName, data)
                    .flatMap(buildResult => {
                    if (buildResult['status'] != 200) {
                        sails.log.error(`Failed to build email result:`);
                        sails.log.error(buildResult);
                        return Rx_1.Observable.throw(new Error('Failed to build email body.'));
                    }
                    return this.sendMessage(to, buildResult['body'], subject);
                })
                    .flatMap(sendResult => {
                    if (sendResult['code'] == '200') {
                        const postSendHooks = _.get(options, "onNotifySuccess", null);
                        if (postSendHooks) {
                            _.each(postSendHooks, (postSendHook) => {
                                const postSendHookFnName = _.get(postSendHook, 'function', null);
                                if (postSendHookFnName) {
                                    const postSendHookFn = eval(postSendHookFnName);
                                    const postSendHookOpts = _.get(postSendHook, 'options', null);
                                    postSendHookFn(oid, record, postSendHookOpts).subscribe(postSendRes => {
                                        sails.log.verbose(`Post notification sending hook completed: ${postSendHookFnName}`);
                                    });
                                }
                            });
                        }
                    }
                    return Rx_1.Observable.of(sendResult);
                });
            }
            else {
                sails.log.verbose(`Not sending notification log for: ${oid}, condition not met: ${_.get(options, "triggerCondition", "")}`);
                sails.log.verbose(JSON.stringify(record));
            }
            return Rx_1.Observable.of(null);
        }
    }
    Services.Email = Email;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Email().exports();
