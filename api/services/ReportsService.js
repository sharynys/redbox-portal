"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rx_1 = require("rxjs/Rx");
const services = require("../core/CoreService.js");
const request = require("request-promise");
var Services;
(function (Services) {
    class Reports extends services.Services.Core.Service {
        constructor() {
            super(...arguments);
            this._exportedMethods = [
                'bootstrap',
                'create',
                'findAllReportsForBrand',
                'get',
                'getResults',
                'getCSVResult',
            ];
            this.bootstrap = (defBrand) => {
                return super.getObservable(Report.find({ branding: defBrand.id })).flatMap(reports => {
                    if (_.isEmpty(reports)) {
                        var rTypes = [];
                        sails.log.verbose("Bootstrapping report definitions... ");
                        _.forOwn(sails.config.reports, (config, report) => {
                            var obs = this.create(defBrand, report, config);
                            obs.subscribe(repProcessed => { });
                            rTypes.push(obs);
                        });
                        return Rx_1.Observable.from(rTypes);
                    }
                    else {
                        var rTypes = [];
                        _.each(reports, function (report) {
                            rTypes.push(Rx_1.Observable.of(report));
                        });
                        sails.log.verbose("Default reports definition(s) exist.");
                        return Rx_1.Observable.from(rTypes);
                    }
                })
                    .last();
            };
        }
        findAllReportsForBrand(brand) {
            return super.getObservable(Report.find({
                branding: brand.id
            }));
        }
        get(brand, name) {
            return super.getObservable(Report.findOne({
                key: brand.id + "_" + name
            }));
        }
        create(brand, name, config) {
            return super.getObservable(Report.create({
                name: name,
                branding: brand.id,
                solr_query: config.solr_query,
                title: config.title,
                filter: config.filter,
                columns: config.columns
            }));
        }
        getResults(brand, name = '', req, start = 0, rows = 10) {
            var reportObs = super.getObservable(Report.findOne({
                key: brand.id + "_" + name
            }));
            return reportObs.flatMap(report => {
                var url = this.addQueryParams(sails.config.record.baseUrl.redbox + sails.config.record.api.search.url, report);
                url = this.addPaginationParams(url, start, rows);
                url = url + "&fq=metaMetadata_brandId:" + brand.id + "&wt=json";
                if (report.filter != null) {
                    if (report.filter.type == 'date-range') {
                        var fromDate = req.param("fromDate");
                        var toDate = req.param("toDate");
                        var searchProperty = report.filter.property;
                        var filterQuery = "&fq=" + searchProperty + ":[";
                        filterQuery = filterQuery + (fromDate == null ? "*" : fromDate);
                        filterQuery = filterQuery + " TO ";
                        filterQuery = filterQuery + (toDate == null ? "*" : toDate) + "]";
                        url = url + filterQuery;
                    }
                }
                var options = this.getOptions(url);
                return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options));
            });
        }
        getCSVResult(brand, name = '', start = 0, rows = 10) {
            var reportObs = super.getObservable(Report.findOne({
                key: brand.id + "_" + name
            }));
            return reportObs.flatMap(report => {
                var url = this.addQueryParams(sails.config.record.baseUrl.redbox + sails.config.record.api.search.url, report);
                url = this.addPaginationParams(url, start, 1000000000);
                url = url + "&fq=metaMetadata_brandId:" + brand.id + "&wt=csv";
                var options = this.getOptions(url, 'text/csv');
                return Rx_1.Observable.fromPromise(request[sails.config.record.api.search.method](options));
            });
        }
        addQueryParams(url, report) {
            url = url + "?q=" + report.solr_query + "&sort=date_object_modified desc&version=2.2&fl=";
            for (var i = 0; i < report.columns.length; i++) {
                var column = report.columns[i];
                url = url + column.property;
                if (i != report.columns.length - 1) {
                    url = url + ",";
                }
            }
            return url;
        }
        addPaginationParams(url, start = 0, rows) {
            url = url + "&start=" + start + "&rows=" + rows;
            return url;
        }
        getOptions(url, contentType = 'application/json; charset=utf-8') {
            return { url: url, json: true, headers: { 'Authorization': `Bearer ${sails.config.redbox.apiKey}`, 'Content-Type': contentType } };
        }
    }
    Services.Reports = Reports;
})(Services = exports.Services || (exports.Services = {}));
module.exports = new Services.Reports().exports();
