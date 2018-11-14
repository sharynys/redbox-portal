"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const controller = require("../core/CoreController.js");
var Controllers;
(function (Controllers) {
    class Vocab extends controller.Controllers.Core.Controller {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'get',
                'getCollection',
                'loadCollection',
                'getMint',
                'searchExternalService',
                'searchPeople',
                'rvaGetResourceDetails'
            ];
        }
        get(req, res) {
            const vocabId = req.param("vocabId");
            VocabService.getVocab(vocabId).subscribe(data => {
                this.ajaxOk(req, res, null, data);
            }, error => {
                sails.log.error(`Failed to get vocab: ${vocabId}`);
                sails.log.error(error);
                this.ajaxFail(req, res, null, [], true);
            });
        }
        getCollection(req, res) {
            const collectionId = req.param('collectionId');
            const searchString = req.query.search ? req.query.search.toLowerCase() : '';
            VocabService.findCollection(collectionId, searchString).subscribe(collections => {
                this.ajaxOk(req, res, null, collections, true);
            }, error => {
                sails.log.error(`Failed to find collection: ${collectionId}, using: '${searchString}'`);
                sails.log.error(error);
                this.ajaxFail(req, res, null, [], true);
            });
        }
        loadCollection(req, res) {
            const collectionId = req.param('collectionId');
            VocabService.loadCollection(collectionId).subscribe(receipt => {
                this.ajaxOk(req, res, null, { status: 'queued', message: 'All good.', receipt: receipt }, true);
            }, error => {
                this.ajaxFail(req, res, null, error, true);
            });
        }
        getMint(req, res) {
            const mintSourceType = req.param('mintSourceType');
            const searchString = req.query.search;
            VocabService.findInMint(mintSourceType, searchString).subscribe(mintResponse => {
                this.ajaxOk(req, res, null, mintResponse.response.docs, true);
            }, error => {
                this.ajaxFail(req, res, null, error, true);
            });
        }
        searchExternalService(req, res) {
            const providerName = req.param('provider');
            const params = req.body;
            VocabService.findInExternalService(providerName, params).subscribe(response => {
                this.ajaxOk(req, res, null, response, true);
            }, error => {
                this.ajaxFail(req, res, null, error, true);
            });
        }
        searchPeople(req, res) {
            const source = req.param('source');
            const page = req.param('page');
            const givenNames = req.param('givenNames');
            const surname = req.param('surname');
            sails.config.peopleSearch[source](givenNames, surname, page).subscribe(response => {
                this.ajaxOk(req, res, null, response, true);
            }, error => {
                this.ajaxFail(req, res, null, error, true);
            });
        }
        rvaGetResourceDetails(req, res) {
            const uri = req.param('uri');
            const vocab = req.param('vocab');
            VocabService.rvaGetResourceDetails(uri, vocab).subscribe(response => {
                this.ajaxOk(req, res, null, response, true);
            }, error => {
                this.ajaxFail(req, res, null, error, true);
            });
        }
    }
    Controllers.Vocab = Vocab;
})(Controllers = exports.Controllers || (exports.Controllers = {}));
module.exports = new Controllers.Vocab().exports();
