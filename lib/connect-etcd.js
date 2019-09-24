/*!
 * Connect - etcd
 * Copyright(c) 2014 Opentable <rtomlinson@opentable.com>
 * MIT Licensed
 */

var Etcd = require('node-etcd');

var defaultHost = '127.0.0.1';
var defaultPort = '2379';
var oneDay = 86400;

module.exports = function (session) {
	var Store = session.Store;

	function EtcdStore(options) {
		const self = this;

		options = options || {};
		
		const host = options.host || defaultHost;
		const port = options.port || defaultPort;

		options.url = options.url || `http://${host}:${port}`;

		Store.call(this, options);

		this.client = new Etcd(options.url);
		this.ttl = options.ttl;
		this.directory = options.directory || 'session';
	};

	EtcdStore.prototype.__proto__ = Store.prototype;

	EtcdStore.prototype.get = function (sid, fn) {
		sid = this.directory + '/' + sid;
		this.client.get(sid, function (err, data) {
			if (err) return fn(err);
			if (!data) return fn();

			var result;
			try {
				result = JSON.parse(data.node.value);
			}
			catch (err) {
				return fn(err);
			}

			return fn(null, result);
		});
	};

	EtcdStore.prototype.set = function (sid, sess, fn) {
		sid = this.directory + '/' + sid;
		var maxAge = sess.cookie.maxAge
			, ttl = this.ttl
			, sess = JSON.stringify(sess);

		ttl = ttl || ('number' == typeof maxAge
			? maxAge / 1000 | 0
			: oneDay);

		this.client.set(sid, sess, { ttl: ttl }, function (err) {
			fn && fn.apply(this, arguments);
		});
	};

	EtcdStore.prototype.destroy = function (sid, fn) {
		this.client.del(sid, fn);
	};

	return EtcdStore;
};