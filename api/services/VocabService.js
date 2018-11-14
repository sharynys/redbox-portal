"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const request = require("request-promise");
var Services;
(function (Services) {
    class Vocab extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'getVocab',
                'loadCollection',
                'findCollection',
                'findInMint',
                'findInExternalService',
                'rvaGetResourceDetails'
            ];
            this.getVocab = (vocabId) => {
                return CacheService.get(vocabId).flatMap(data => {
                    if (data) {
                        sails.log.verbose(`Returning cached vocab: ${vocabId}`);
                        return Rx_1.Observable.of(data);
                    }
                    if (sails.config.vocab.nonAnds && sails.config.vocab.nonAnds[vocabId]) {
                        return this.getNonAndsVocab(vocabId);
                    }
                    const url = `${sails.config.vocab.rootUrl}${vocabId}/${sails.config.vocab.conceptUri}`;
                    let items = null;
                    const rawItems = [];
                    return this.getConcepts(url, rawItems).flatMap(allRawItems => {
                        items = _.map(allRawItems, rawItem => {
                            return { uri: rawItem._about, notation: rawItem.notation, label: rawItem.prefLabel._value };
                        });
                        CacheService.set(vocabId, items);
                        return Rx_1.Observable.of(items);
                    });
                });
            };
        }
        bootstrap() {
            return _.isEmpty(sails.config.vocab.bootStrapVocabs) ?
                Rx_1.Observable.of(null)
                : Rx_1.Observable.from(sails.config.vocab.bootStrapVocabs)
                    .flatMap(vocabId => {
                    return this.getVocab(vocabId);
                })
                    .last();
        }
        findInMint(sourceType, queryString) {
            queryString = _.trim(queryString);
            let searchString = '';
            if (!_.isEmpty(queryString)) {
                searchString = ` AND (${queryString})`;
            }
            const mintUrl = `${sails.config.record.baseUrl.mint}${sails.config.mint.api.search.url}?q=repository_type:${sourceType}${searchString}&version=2.2&wt=json&start=0`;
            sails.log(mintUrl);
            const options = this.getMintOptions(mintUrl);
            sails.log.verbose(options);
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options));
        }
        findInExternalService(providerName, params) {
            const method = sails.config.vocab.providers[providerName].method;
            let url = sails.config.vocab.providers[providerName].url;
            let templateFunction = this.getTemplateStringFunction(url);
            url = templateFunction(params.options);
            sails.log.info(url);
            let options = sails.config.vocab.providers[providerName].options;
            options['url'] = url;
            options['json'] = true;
            sails.log.verbose(options);
            if (method == 'post') {
                options['body'] = params.postBody;
            }
            return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options));
        }
        getTemplateStringFunction(template) {
            var sanitized = template
                .replace(/\$\{([\s]*[^;\s\{]+[\s]*)\}/g, function (_, match) {
                return `\$\{map.${match.trim()}\}`;
            })
                .replace(/(\$\{(?!map\.)[^}]+\})/g, '');
            return Function('map', `return \`${sanitized}\``);
        }
        getConcepts(url, rawItems) {
            console.log(`Getting concepts....${url}`);
            const options = { url: url, json: true };
            return Rx_1.Observable.fromPromise(request.get(options))
                .flatMap((resp) => {
                let response = resp;
                rawItems = rawItems.concat(response.result.items);
                if (response.result && response.result.next) {
                    return this.getConcepts(response.result.next, rawItems);
                }
                return Rx_1.Observable.of(rawItems);
            });
        }
        getNonAndsVocab(vocabId) {
            const url = sails.config.vocab.nonAnds[vocabId].url;
            const options = { url: url, json: true };
            return Rx_1.Observable.fromPromise(request.get(options)).flatMap(response => {
                CacheService.set(vocabId, response);
                return Rx_1.Observable.of(response);
            });
        }
        loadCollection(collectionId, progressId, force = false) {
            const getMethod = sails.config.vocab.collection[collectionId].getMethod;
            const bufferCount = sails.config.vocab.collection[collectionId].processingBuffer;
            const processWindow = sails.config.vocab.collection[collectionId].processingTime;
            let collectionData = null;
            return this[getMethod](collectionId).flatMap(data => {
                if (_.isEmpty(data) || force) {
                    const url = sails.config.vocab.collection[collectionId].url;
                    sails.log.verbose(`Loading collection: ${collectionId}, using url: ${url}`);
                    const methodName = sails.config.vocab.collection[collectionId].saveMethod;
                    const options = { url: url, json: true };
                    return Rx_1.Observable.fromPromise(request.get(options))
                        .flatMap(resp => {
                        let response = resp;
                        sails.log.verbose(`Got response retrieving data for collection: ${collectionId}, saving...`);
                        sails.log.verbose(`Number of items: ${response.length}`);
                        const itemsToSave = _.chunk(response, bufferCount);
                        collectionData = itemsToSave;
                        const updateObj = { currentIdx: 0, targetIdx: collectionData.length };
                        return AsynchsService.update({ id: progressId }, updateObj);
                    })
                        .flatMap(updateResp => {
                        sails.log.verbose(`Updated asynch progress...`);
                        return Rx_1.Observable.from(collectionData);
                    })
                        .map((buffer, i) => {
                        setTimeout(() => {
                            sails.log.verbose(`Processing chunk: ${i}`);
                            return this.saveCollectionChunk(methodName, buffer, i)
                                .flatMap(saveResp => {
                                sails.log.verbose(`Updating chunk progress...${i}`);
                                if (i == collectionData.length) {
                                    sails.log.verbose(`Asynch completed.`);
                                    return AsynchsService.finish(progressId);
                                }
                                else {
                                    return AsynchsService.update({ id: progressId }, { currentIdx: i + 1, status: 'processing' });
                                }
                            });
                        }, i * processWindow);
                    })
                        .concat();
                }
                else {
                    sails.log.verbose(`Collection already loaded: ${collectionId}`);
                    return Rx_1.Observable.of(null);
                }
            });
        }
        saveCollectionChunk(methodName, buffer, i) {
            return this[methodName](buffer);
        }
        findCollection(collectionId, searchString) {
            return this[sails.config.vocab.collection[collectionId].searchMethod](searchString);
        }
        rvaGetResourceDetails(uri, vocab) {
            const url = sails.config.vocab.rootUrl + `${vocab}/resource.json?uri=${uri}`;
            const options = { url: url, json: true };
            return Rx_1.Observable.fromPromise(request.get(options)).flatMap(response => {
                CacheService.set(vocab, response);
                return Rx_1.Observable.of(response);
            });
        }
        saveInst(instItems) {
            _.forEach(instItems, item => {
                item.text_name = item.name;
            });
            return RecordsService.createBatch(sails.config.vocab.collection['grid'].type, instItems, 'grid_id');
        }
        searchInst(searchString, fields) {
            return RecordsService.search(sails.config.vocab.collection['grid'].type, sails.config.vocab.collection['grid'].searchField, searchString, sails.config.vocab.collection['grid'].fields);
        }
        getInst(collectionId) {
            return RecordsService.getOne(sails.config.vocab.collection[collectionId].type);
        }
        getMintOptions(url) {
            return { url: url, json: true, headers: { 'Authorization': `Bearer ${sails.config.mint.apiKey}`, 'Content-Type': 'application/json; charset=utf-8' } };
        }
    }
    Services.Vocab = Vocab;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Vocab().exports();
