const dynamicExport = new Proxy({}, {
	get(target, prop){
		if(['logger', 'blogger'].includes(prop)){
			return require(`./${prop}`);
		}
		return undefined;
	}
});

module.exports = dynamicExport;
