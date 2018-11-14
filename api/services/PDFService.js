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
const puppeteer_1 = require("puppeteer");
const moment_es6_1 = require("moment-es6");
var Services;
(function (Services) {
    class PDF extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'createPDF'
            ];
        }
        createBrowser() {
            return __awaiter(this, void 0, void 0, function* () {
                sails.pdfService.browser = yield puppeteer_1.launch({ headless: true, args: ['--no-sandbox'] });
                sails.pdfService.browser.on("disconnected", this.createBrowser);
            });
        }
        generatePDF(oid, record, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const page = yield sails.pdfService.browser.newPage();
                const token = options['token'] ? options['token'] : undefined;
                if (token == undefined) {
                    sails.log.warning("API token for PDF generation is not set. Skipping generation");
                    return;
                }
                page.setExtraHTTPHeaders({
                    Authorization: 'Bearer ' + token
                });
                let currentURL = `${sails.config.appUrl}/default/rdmp/record/view/${oid}`;
                page
                    .waitForSelector(options['waitForSelector'], { timeout: 60000 })
                    .then(() => __awaiter(this, void 0, void 0, function* () {
                    yield this.delay(1500);
                    const date = moment_es6_1.default().format('x');
                    const pdfPrefix = options['pdfPrefix'];
                    const fileId = `${pdfPrefix}-${oid}-${date}.pdf`;
                    const fpath = `${sails.config.record.attachments.stageDir}/${fileId}`;
                    let defaultPDFOptions = {
                        path: fpath,
                        format: 'A4',
                        printBackground: true
                    };
                    if (options['PDFOptions']) {
                        delete options['PDFOptions']['path'];
                        defaultPDFOptions = _.merge(defaultPDFOptions, options['PDFOptions']);
                    }
                    yield page.pdf(defaultPDFOptions);
                    sails.log.debug(`Generated PDF at ${sails.config.record.attachments.stageDir}/${fileId} `);
                    yield page.close();
                    Rx_1.Observable.fromPromise(RecordsService.addDatastream(oid, fileId)).subscribe(response => {
                        sails.log.debug("Saved PDF to storage");
                    });
                }));
                sails.log.debug("Chromium loading page");
                yield page.goto(currentURL);
                sails.log.debug("Chromium loading");
            });
        }
        createPDF(oid, record, options, user) {
            sails.log.error("Creating PDF");
            if (!sails.pdfService || !sails.pdfService.browser) {
                sails.pdfService = {};
                let browserPromise = this.createBrowser();
                browserPromise.then(() => __awaiter(this, void 0, void 0, function* () { this.generatePDF(oid, record, options); }));
            }
            else {
                this.generatePDF(oid, record, options);
            }
            return Rx_1.Observable.of({});
        }
        delay(time) {
            return new Promise(function (resolve) {
                setTimeout(resolve, time);
            });
        }
    }
    Services.PDF = PDF;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.PDF().exports();
