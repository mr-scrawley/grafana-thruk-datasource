'use strict';

System.register(['lodash', 'app/core/table_model'], function (_export, _context) {
  "use strict";

  var _, TableModel, _createClass, ThrukDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_appCoreTable_model) {
      TableModel = _appCoreTable_model.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('ThrukDatasource', ThrukDatasource = function () {
        function ThrukDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, ThrukDatasource);

          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.url = instanceSettings.url;
          this.withCredentials = instanceSettings.withCredentials;
          this.basicAuth = instanceSettings.basicAuth;
        }

        // testDatasource is used on the datasource options page


        _createClass(ThrukDatasource, [{
          key: 'testDatasource',
          value: function testDatasource() {
            var requestOptions = this._requestOptions({
              url: this.url + '/r/v1/',
              method: 'GET'
            });
            return this.backendSrv.datasourceRequest(requestOptions).then(function (response) {
              if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
              }
            });
          }
        }, {
          key: 'annotationQuery',
          value: function annotationQuery(options) {
            var query = this._parseQuery(this._replaceVariables(options.annotation.query, options.range, options.scopedVars));
            var path = query.table.replace(/^\//, '');
            if (query.columns[0] != "time") {
              throw new Error("query syntax error, first column must be 'time' for annotations.");
            }
            var params = {
              columns: query.columns
            };
            params.q = query.where;

            var requestOptions = this._requestOptions({
              url: this.url + '/r/v1/' + path,
              method: 'GET',
              params: params
            });
            return this.backendSrv.datasourceRequest(requestOptions).then(function (result) {
              return _.map(result.data, function (d, i) {
                return {
                  "annotation": options.annotation,
                  "title": d['type'],
                  "time": d['time'] * 1000,
                  "text": d['message'].replace(/^\[\d+\]\s+/, '').replace(/^[^:]+:\s+/, ''),
                  "tags": d['type']
                };
              });
            }).catch(this._handleQueryError.bind(this));
          }
        }, {
          key: 'metricFindQuery',
          value: function metricFindQuery(options) {
            var query = this._parseQuery(this._replaceVariables(options));
            var path = query.table + "?columns=" + query.columns;
            path = path.replace(/^\//, '');
            if (query.where) {
              path += '&q=' + encodeURIComponent(query.where);
            }
            var requestOptions = this._requestOptions({
              url: this.url + '/r/v1/' + path,
              method: 'GET'
            });
            return this.backendSrv.datasourceRequest(requestOptions).then(function (result) {
              return _.map(result.data, function (d, i) {
                return { text: Object.values(d).join(';'), value: Object.values(d).join(';') };
              });
            }).catch(this._handleQueryError.bind(this));
          }
        }, {
          key: 'query',
          value: function query(options) {
            var This = this;
            // we can only handle a single query right now
            for (var x = 0; x < options.targets.length; x++) {
              var table = new TableModel();
              var target = options.targets[x];
              var path = target.table;
              var hasColumns = false;
              var params = {};

              if (!path) {
                return This.$q.when([]);
              }
              path = path.replace(/^\//, '');
              path = this._replaceVariables(path, options.range, options.scopedVars);

              if (!target.columns) {
                target.columns = [];
              }
              if (target.columns[0] == '*') {
                target.columns.shift();
              }
              if (target.columns.length > 0) {
                params.columns = target.columns.join(',');
                target.columns.forEach(function (col) {
                  This._addColumn(table, col);
                });
                hasColumns = true;
              }
              if (target.condition) {
                params.q = this._replaceVariables(target.condition, options.range, options.scopedVars);
              }
              if (target.limit) {
                params.limit = target.limit;
              }
              var requestOptions = This._requestOptions({
                url: This.url + '/r/v1/' + path,
                method: 'GET',
                params: params
              });
              return This.backendSrv.datasourceRequest(requestOptions).then(function (result) {
                // extract columns from first result row unless specified
                if (!hasColumns && result.data[0]) {
                  Object.keys(result.data[0]).forEach(function (col) {
                    This._addColumn(table, col);
                  });
                }
                // add data rows
                _.map(result.data, function (d, i) {
                  var row = [];
                  table.columns.forEach(function (col) {
                    if (col.type == "time") {
                      row.push(d[col.text] * 1000);
                    } else {
                      row.push(d[col.text]);
                    }
                  });
                  table.rows.push(row);
                });
                return {
                  data: [table]
                };
              }).catch(this._handleQueryError.bind(this));
            }
          }
        }, {
          key: '_addColumn',
          value: function _addColumn(table, col) {
            if (col.match(/^(last_|next_|time)/)) {
              table.addColumn({ text: col, type: 'time' });
            } else {
              table.addColumn({ text: col });
            }
          }
        }, {
          key: '_requestOptions',
          value: function _requestOptions(options) {
            options = options || {};
            options.headers = options.headers || {};
            if (this.basicAuth || this.withCredentials) {
              options.withCredentials = true;
            }
            if (this.basicAuth) {
              options.headers.Authorization = this.basicAuth;
            }
            options.headers['Content-Type'] = 'application/json';
            return options;
          }
        }, {
          key: '_parseQuery',
          value: function _parseQuery(query) {
            var tmp = query.match(/^\s*SELECT\s+([\w_,\ ]+)\s+FROM\s+([\w_\/]+)(|\s+WHERE\s+(.*))(|\s+LIMIT\s+(\d+))$/i);
            if (!tmp) {
              throw new Error("query syntax error, expecting: SELECT <column>[,<columns>] FROM <rest url> [WHERE <filter conditions>] [LIMIT <limi>]");
            }
            return {
              columns: tmp[1].replace(/\s+/g, ''),
              table: tmp[2],
              where: tmp[4],
              limit: tmp[6]
            };
          }
        }, {
          key: '_replaceVariables',
          value: function _replaceVariables(str, range, scopedVars) {
            str = this.templateSrv.replace(str, scopedVars, function (s) {
              if (s && angular.isArray(s)) {
                var escaped = [];
                s.forEach(function (v) {
                  escaped.push(_.escapeRegExp(v));
                });
                return "^(" + escaped.join('|') + ')$';
              }
              return s;
            });
            // replace time filter
            if (range) {
              var matches = str.match(/(\w+)\s*=\s*\$time/);
              if (matches && matches[1]) {
                var field = matches[1];
                var timefilter = "(" + field + " > " + Math.floor(range.from.toDate().getTime() / 1000);
                timefilter += " AND " + field + " < " + Math.floor(range.to.toDate().getTime() / 1000);
                timefilter += ")";
                str = str.replace(matches[0], timefilter);
              }
            }

            // fixup list regex filters
            var matches = str.match(/([\w_]+)\s*>=\s*"\^\((.*?)\)\$"/);
            while (matches) {
              var groups = [];
              var segments = matches[2].split('|');
              segments.forEach(function (s) {
                groups.push(matches[1] + ' >= "' + s + '"');
              });
              str = str.replace(matches[0], '(' + groups.join(' OR ') + ')');
              matches = str.match(/([\w_]+)\s*>=\s*"\^\((.*?)\)\$"/);
            }

            return str;
          }
        }, {
          key: '_handleQueryError',
          value: function _handleQueryError(err) {
            console.log(err);
            if (err.data && err.data.code && err.data.code >= 400) {
              var error = "query error: " + err.data.message;
              if (err.data.description) {
                error += " - " + err.data.description;
              }
              throw new Error(error);
            }
            if (err.status && err.status > 400) {
              throw new Error("query error: " + err.status + " - " + err.statusText);
            }
            throw new Error(err);
            return [];
          }
        }]);

        return ThrukDatasource;
      }());

      _export('ThrukDatasource', ThrukDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
