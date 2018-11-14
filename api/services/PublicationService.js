"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
require("rxjs/add/operator/toPromise");
const fs = require("graceful-fs");
const path = require("path");
const calcyte_1 = require("calcyte");
const datacrate = require('datacrate').catalog;
var Services;
(function (Services) {
    class DataPublication extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'exportDataset'
            ];
        }
        exportDataset(oid, record, options) {
            if (this.metTriggerCondition(oid, record, options) === "true") {
                sails.log.info("Called exportDataset on update");
                sails.log.info("oid: " + oid);
                sails.log.info("options: " + JSON.stringify(options));
                const site = sails.config.datapubs.sites[options['site']];
                if (!site) {
                    sails.log.error("Unknown publication site " + options['site']);
                    return Rx_1.Observable.of(null);
                }
                const md = record['metadata'];
                const drec = md['dataRecord'];
                const drid = drec ? drec['oid'] : undefined;
                if (!drid) {
                    sails.log.error("Couldn't find dataRecord or id for data pub " + oid);
                    sails.log.info(JSON.stringify(record));
                    return Rx_1.Observable.of(null);
                }
                sails.log.info("Got data record: " + drid);
                const attachments = md['dataLocations'].filter((a) => a['type'] === 'attachment');
                const dir = path.join(site['dir'], oid);
                try {
                    sails.log.info("making dataset dir: " + dir);
                    fs.mkdirSync(dir);
                }
                catch (e) {
                    sails.log.error("Couldn't create dataset dir " + dir);
                    sails.log.error(e.name);
                    sails.log.error(e.message);
                    sails.log.error(e.stack);
                    return Rx_1.Observable.of(null);
                }
                sails.log.info("Going to write attachments");
                const obs = attachments.map((a) => {
                    sails.log.info("building attachment observable " + a['name']);
                    return RecordsService.getDatastream(drid, a['fileId']).
                        flatMap(ds => {
                        const filename = path.join(dir, a['name']);
                        sails.log.info("about to write " + filename);
                        return Rx_1.Observable.fromPromise(this.writeData(ds.body, filename))
                            .catch(err => {
                            sails.log.error("Error writing attachment " + a['fileId']);
                            sails.log.error(err.name);
                            sails.log.error(err.message);
                            return new Rx_1.Observable();
                        });
                    });
                });
                obs.push(this.makeDataCrate(oid, dir, md));
                obs.push(this.updateUrl(oid, record, site['url']));
                return Rx_1.Observable.merge(...obs);
            }
            else {
                sails.log.info(`Not sending notification log for: ${oid}, condition not met: ${_.get(options, "triggerCondition", "")}`);
                return Rx_1.Observable.of(null);
            }
        }
        writeData(buffer, fn) {
            return new Promise((resolve, reject) => {
                try {
                    fs.writeFile(fn, buffer, () => {
                        sails.log.info("wrote to " + fn);
                        resolve(true);
                    });
                }
                catch (e) {
                    sails.log.error("attachment write error");
                    sails.log.error(e.name);
                    sails.log.error(e.message);
                    reject;
                }
            });
        }
        writeDatastream(stream, fn) {
            return new Promise((resolve, reject) => {
                var wstream = fs.createWriteStream(fn);
                sails.log.info("start writeDatastream " + fn);
                stream.pipe(wstream);
                stream.end();
                wstream.on('finish', () => {
                    sails.log.info("finished writeDatastream " + fn);
                    resolve(true);
                });
                wstream.on('error', (e) => {
                    sails.log.error("File write error");
                    reject;
                });
            });
        }
        updateUrl(oid, record, baseUrl) {
            const branding = sails.config.auth.defaultBrand;
            record['metadata']['citation_url'] = baseUrl + '/' + oid;
            return RecordsService.updateMeta(branding, oid, record);
        }
        makeDataCrate(oid, dir, metadata) {
            const owner = 'TODO@shouldnt.the.owner.come.from.the.datapub';
            const approver = 'TODO@get.the.logged-in.user';
            return Rx_1.Observable.of({})
                .flatMap(() => {
                return Rx_1.Observable.fromPromise(datacrate.datapub2catalog({
                    'id': oid,
                    'datapub': metadata,
                    'organisation': sails.config.datapubs.datacrate.organization,
                    'owner': owner,
                    'approver': approver
                }));
            }).flatMap((catalog) => {
                try {
                    const jsonld_h = new calcyte_1.jsonld();
                    const catalog_json = path.join(dir, sails.config.datapubs.datacrate.catalog_json);
                    sails.log.info(`Writing CATALOG.json`);
                    jsonld_h.init(catalog);
                    jsonld_h.trim_context();
                    fs.writeFileSync(catalog_json, JSON.stringify(jsonld_h.json_ld, null, 2));
                    const index = new calcyte_1.Index();
                    index.init(catalog, dir, false);
                    sails.log.info(`Writing CATALOG.html`);
                    index.make_index_html("text_citation", "zip_path");
                    return Rx_1.Observable.of({});
                }
                catch (e) {
                    sails.log.error("Error while creating DataCrate");
                    sails.log.error(e.name);
                    sails.log.error(e.message);
                    sails.log.error(e.stack);
                    return Rx_1.Observable.of(null);
                }
            }).catch(error => {
                sails.log.error("Error while creating DataCrate");
                sails.log.error(error.name);
                sails.log.error(error.message);
                return Rx_1.Observable.of({});
            });
        }
    }
    Services.DataPublication = DataPublication;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.DataPublication().exports();
