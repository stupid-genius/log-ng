const chai = require('chai');
const path = require('path');
const { PassThrough } = require('stream');
const { transports } = require('winston');
const Logger = require('./logger');

chai.should();
const { Stream } = transports;

const localLogger = new Logger(path.basename(__filename));

function attachToLogger() {
	const logpipe = new PassThrough({
		objectMode: true
	});

	function dataReady() {
		return new Promise((resolve, reject) => {
			if (logpipe.readable) {
				resolve();
				return;
			}
			logpipe.on('readable', () => {
				resolve();
			});
			logpipe.on('error', (msg) => {
				localLogger.error(`Error in logpipe: ${msg}`);
				reject();
			});
		});
	}

	const newTransport = new Stream({
		eol: '\n',
		format: null,
		stream: logpipe
	});
	Logger.addTransport('tee', newTransport);

	return {
		// this will wait until a log is written
		pop: async () => {
			await dataReady();
			return logpipe.read();
		},
		detach: () => Logger.removeTransport('tee')
	};
}

describe('Logger', function () {
	beforeEach(function () {
		this.UUT = new Logger(path.basename(__filename));
	});

	it('should be properly constructed', function () {
		this.UUT.constructor.name.should.equal('DerivedLogger');
		this.UUT.should.have.property('getLogLevel');
		this.UUT.should.have.property('setLogLevel');
		this.UUT.getLogLevel().should.equal('debug');
		const defaultTransport = this.UUT.transports;
		defaultTransport.should.have.length(2);
	});

	it('can dynamically add a transport', function () {
		const defaultTransport = this.UUT.transports;
		defaultTransport.should.have.length(2);
		(defaultTransport[0] instanceof transports.File).should.be.true;

		const newTransport = new Stream({
			stream: new PassThrough(),
			level: 'silly'
		});
		Logger.addTransport('test', newTransport);

		const updatedTransports = this.UUT.transports;
		updatedTransports.should.have.length(3);
		updatedTransports[2].should.equal(newTransport);

		Logger.removeTransport('test');

		const originalTransports = this.UUT.transports;
		originalTransports.should.have.length(2);
		(originalTransports[0] instanceof transports.File).should.be.true;
	});

	it('can dynamically change log level', function () {
		this.UUT.getLogLevel().should.equal('debug');
		this.UUT.setLogLevel('info');
		this.UUT.getLogLevel().should.equal('info');
	});

	it('should be able to test the logging output', async function () {
		const logs = attachToLogger();

		const expectedLvl = 'info';
		const expectedMsg = 'This is an info log message';
		const expectedLvl2 = 'error';
		const expectedMsg2 = 'This is an error log message';

		this.UUT.log(expectedLvl, expectedMsg);
		this.UUT.log(expectedLvl2, expectedMsg2);

		let log;
		log = await logs.pop();
		log.message.should.equal(expectedMsg);
		log.level.should.equal(expectedLvl);

		log = await logs.pop();
		log.message.should.equal(expectedMsg2);
		log.level.should.equal(expectedLvl2);

		logs.detach();
	});

	it('should show metadata when present', async function () {
		const logs = attachToLogger();
		this.UUT.info('This logged with filename metadata');
		const log = await logs.pop();
		log.should.have.property('fileName');
		log.fileName.should.equal(path.basename(__filename));
		logs.detach();
	});
});
