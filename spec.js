const assert = require('chai').assert;
const sinon = require('sinon');
import Logger from './blogger';

describe('Logger', function(){
	before(function(){
		Logger.setLogLevel('debug');
		Logger.removeTransport('default');
	});
	beforeEach(function(){
		this.UUT = new Logger('spec.js');
	});
	it('should be properly constructed', function(){
		assert.instanceOf(this.UUT, Logger);
		Object.entries(Logger).forEach(([k, v]) => {
			assert.property(this.UUT, v, `${v} method should exist on Logger instance`);
			assert.isFunction(this.UUT[v], `${v} should be a function on Logger instance`);
		});
	});
	it('can dynamically add/remove a transport', async function(){
		let transportSpy;
		await new Promise((res, rej) => {
			const expected = 'This is a custom transport';
			const testTransport = (params) => {
				assert.equal(params.msg, expected);
				res();
			};
			transportSpy = sinon.spy(testTransport);
			Logger.addTransport('testTransport', {
				log: transportSpy
			});
			assert.isDefined(Logger.state.transports.testTransport);

			this.UUT.info(expected);
		});
		assert.isTrue(transportSpy.calledOnce);

		Logger.removeTransport('testTransport');
		assert.notProperty(Logger.state.transports, 'testTransport');
	});
	it('can dynamically change log level', async function(){
		this.timeout(4000);
		const expected = 'This is logged at `info` level';
		const testTransport = (params) => {
			assert.equal(params.msg, expected);
			params.args[0]?.res();
		};
		const transportSpy = sinon.spy(testTransport);
		Logger.addTransport('testTransport', {
			log: transportSpy
		});

		await new Promise((res, rej) => {
			this.UUT.info(expected, {res});
		});
		assert.isTrue(transportSpy.called);

		transportSpy.resetHistory();

		Logger.setLogLevel('warn');
		assert.equal(Logger.level, 'warn');

		await new Promise((res, rej) => {
			this.UUT.info(expected, {res});
			setTimeout(res, 2500);
		});
		assert.isFalse(transportSpy.called, 'Info log not filtered');
		Logger.removeTransport('testTransport');
	});
	it.skip('should be able to test the logging output', function(){});
	it.skip('should show metadata when present', function(){});
});
