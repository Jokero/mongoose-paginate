var Promise = require('bluebird');

/**
 * @param {Object}              [criteria={}]
 * @param {Object}              [options={}]
 * @param {Object|String}         [options.select]
 * @param {Object|String}         [options.sort]
 * @param {Array|Object|String}   [options.populate]
 * @param {Boolean}               [options.lean=false]
 * @param {Boolean}               [options.leanWithId=true]
 * @param {Number}                [options.offset=0] - Use offset or page to set skip position
 * @param {Number}                [options.page=1]
 * @param {Number}                [options.limit=10]
 * @param {Function}            [callback]
 *
 * @returns {Promise}
 */
function paginate(criteria, options, callback) {
    criteria = criteria || {};
    options  = options || {};

    var select     = options.select;
    var sort       = options.sort;
    var populate   = options.populate;
    var lean       = options.lean || false;
    var leanWithId = options.hasOwnProperty('leanWithId') ? options.leanWithId : true;

    var limit  = options.hasOwnProperty('limit') ? options.limit : 10;
    var offset = 0;
    var page   = 1;

    if (options.hasOwnProperty('offset')) {
        offset = options.offset;
        page   = Math.ceil((offset + 1) / limit);
    } else if (options.hasOwnProperty('page')) {
        page   = options.page;
        offset = (page - 1) * limit;
    }

    var promises = {
        docs:  Promise.resolve([]),
        count: this.count(criteria).exec()
    };

    if (limit) {
        var query = this.find(criteria)
                        .select(select)
                        .sort(sort)
                        .skip(offset)
                        .limit(limit)
                        .lean(lean);

        if (populate) {
            [].concat(populate).forEach(function(item) {
                query.populate(item);
            });
        }

        promises.docs = query.exec();

        if (lean && leanWithId) {
            promises.docs = promises.docs.then(function(docs) {
                docs.forEach(function(doc) {
                    doc.id = String(doc._id);
                });

                return docs;
            });
        }
    }

    return Promise.props(promises)
        .then(function(result) {
            return {
                docs:   result.docs,
                offset: offset,
                page:   page,
                limit:  limit,
                pages:  Math.ceil(result.count / limit) || 1,
                total:  result.count
            };
        })
        .asCallback(callback);
}

/**
 * @param {Schema} schema
 */
module.exports = function(schema) {
    schema.statics.paginate = paginate;
};