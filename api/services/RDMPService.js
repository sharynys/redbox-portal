"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
var Services;
(function (Services) {
    class RDMPS extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'assignPermissions'
            ];
        }
        addEmailToList(contributor, emailProperty, emailList) {
            let editContributorEmailAddress = _.get(contributor, emailProperty, null);
            if (!editContributorEmailAddress) {
                if (!contributor) {
                    return;
                }
                editContributorEmailAddress = contributor;
            }
            if (editContributorEmailAddress != null && !_.isEmpty(editContributorEmailAddress) && !_.isUndefined(editContributorEmailAddress) && _.isString(editContributorEmailAddress)) {
                sails.log.verbose(`Pushing contrib email address ${editContributorEmailAddress}`);
                emailList.push(editContributorEmailAddress);
            }
        }
        populateContribList(contribProperties, record, emailProperty, emailList) {
            _.each(contribProperties, editContributorProperty => {
                let editContributor = _.get(record, editContributorProperty, null);
                if (editContributor) {
                    sails.log.verbose(`Contributor:`);
                    sails.log.verbose(JSON.stringify(editContributor));
                    if (_.isArray(editContributor)) {
                        _.each(editContributor, contributor => {
                            this.addEmailToList(contributor, emailProperty, emailList);
                        });
                    }
                    else {
                        this.addEmailToList(editContributor, emailProperty, emailList);
                    }
                }
            });
            return _.uniq(emailList);
        }
        filterPending(users, userEmails, userList) {
            _.each(users, user => {
                if (user != null) {
                    _.remove(userEmails, email => {
                        return email == user['email'];
                    });
                    userList.push(user['username']);
                }
            });
        }
        assignPermissions(oid, record, options) {
            sails.log.verbose(`Assign Permissions executing on oid: ${oid}, using options:`);
            sails.log.verbose(JSON.stringify(options));
            sails.log.verbose(`With record: `);
            sails.log.verbose(record);
            const emailProperty = _.get(options, "emailProperty", "email");
            const editContributorProperties = _.get(options, "editContributorProperties", []);
            const viewContributorProperties = _.get(options, "viewContributorProperties", []);
            let authorization = _.get(record, "authorization", {});
            let editContributorObs = [];
            let viewContributorObs = [];
            let editContributorEmails = [];
            let viewContributorEmails = [];
            editContributorEmails = this.populateContribList(editContributorProperties, record, emailProperty, editContributorEmails);
            viewContributorEmails = this.populateContribList(viewContributorProperties, record, emailProperty, viewContributorEmails);
            if (_.isEmpty(editContributorEmails)) {
                sails.log.error(`No editors for record: ${oid}`);
            }
            if (_.isEmpty(viewContributorEmails)) {
                sails.log.error(`No viewers for record: ${oid}`);
            }
            _.each(editContributorEmails, editorEmail => {
                editContributorObs.push(this.getObservable(User.findOne({ email: editorEmail })));
            });
            _.each(viewContributorEmails, viewerEmail => {
                viewContributorObs.push(this.getObservable(User.findOne({ email: viewerEmail })));
            });
            return Rx_1.Observable.zip(...editContributorObs)
                .flatMap(editContributorUsers => {
                let newEditList = [];
                this.filterPending(editContributorUsers, editContributorEmails, newEditList);
                record.authorization.edit = newEditList;
                record.authorization.editPending = editContributorEmails;
                return Rx_1.Observable.zip(...viewContributorObs);
            })
                .flatMap(viewContributorUsers => {
                let newviewList = [];
                this.filterPending(viewContributorUsers, editContributorEmails, newviewList);
                record.authorization.view = newviewList;
                record.authorization.viewPending = viewContributorEmails;
                return Rx_1.Observable.of(record);
            });
        }
    }
    Services.RDMPS = RDMPS;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.RDMPS().exports();
