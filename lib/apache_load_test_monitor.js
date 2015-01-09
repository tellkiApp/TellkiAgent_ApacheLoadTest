
//node apache_site_status_monitor.js 1519 "1,1,1,1,1,1,1,1,1,1,1" "1520,1521" "http://www.apache.org#100#5"

var loadtest = require('loadtest');

var metrics = []

metrics["CompleteRequests"] = {id:"125:Complete Requests:4", retrieve:false};
metrics["totalErrors"] = {id:"219:Failed Requests:4", retrieve:false};
metrics["totalRequests"] = {id:"217:Total Requests:4", retrieve:false};
metrics["rps"] = {id:"156:Requests/Sec:4", retrieve:false};
metrics["50"] = {id:"122:50th Percentile:4", retrieve:false};
metrics["90"] = {id:"30:90th Percentile:4", retrieve:false};
metrics["95"] = {id:"67:95th Percentile:4", retrieve:false};
metrics["99"] = {id:"203:99th Percentile:4", retrieve:false};
metrics["meanLatencyMs"] = {id:"118:Mean Response Time:4", retrieve:false};
metrics["totalTimeSeconds"] = {id:"84:Total Time:4", retrieve:false};
metrics["Status"] = {id:"87:Status:9", retrieve:false}; 



var runs = 0;

//####################### EXCEPTIONS ################################

function InvalidParametersNumberError() {
    this.name = "InvalidParametersNumberError";
    this.message = ("Wrong number of parameters.");
}
InvalidParametersNumberError.prototype = Object.create(Error.prototype);
InvalidParametersNumberError.prototype.constructor = InvalidParametersNumberError;

function InvalidMetricStateError() {
    this.name = "InvalidMetricStateError";
    this.message = ("Invalid value in metric state.");
}
InvalidMetricStateError.prototype = Object.create(Error.prototype);
InvalidMetricStateError.prototype.constructor = InvalidMetricStateError;




// ############# INPUT ###################################

(function() {
	try
	{
		monitorInput(process.argv.slice(2));
	}
	catch(err)
	{	
		if(err instanceof InvalidParametersNumberError)
		{
			console.log(err.message);
			process.exit(3);
		}
		else if(err instanceof InvalidMetricStateError)
		{
			console.log(err.message);
			process.exit(9);
		}
		else
		{
			console.log(err.message);
			process.exit(1);
		}
	}
}).call(this)



function monitorInput(args)
{
	
	if(args.length != 3)
	{
		throw new InvalidParametersNumberError()
	}		
	
	monitorInputProcess(args);
}


function monitorInputProcess(args)
{	
	//metric state
	var metricState = args[0].replace("\"", "");
	
	var tokens = metricState.split(",");

	var metricsName = Object.keys(metrics);
	
	if (tokens.length === metricsName.length)
	{
		for(var i in tokens)
		{
			metrics[metricsName[i]].retrieve = (tokens[i] === "1")
		}
	}
	else
	{
		throw new InvalidMetricStateError();
	}
	
	var targetsTest = args[1].split(",");
	
	var testsArgs = args[2].split(",");
	
	var tests = [];
	
	
	for(var i in testsArgs)
	{
		var t = testsArgs[i].split("#");

		if(t.length === 3)
		{
			var test = new Object()
			test.url = t[0];
			test.maxRequests = t[1];
			test.concurrency = t[2];
			test.targetId = targetsTest[i]
			
			tests.push(test);
		}
	}

	
	monitorApacheSiteStatus(tests);
	
}




//################### OUTPUT ###########################

function output(outputs)
{
	for(var i in outputs)
	{
		var out = "";
		
		var output = outputs[i];
		
		out += "|";
		out += output.metricId;
		out += "|";
		out += output.targetId;
		out += "|";
		out += output.value
		out += "|";
		out += output.object
	
		console.log(out);
	}
	
}



function errorHandler(err)
{
	console.log(err.message);
	process.exit(1);
}


// ################# MONITOR ###########################

function monitorApacheSiteStatus(tests) 
{

/**
 * Run a load test.
 * Options is an object which may have:
 *	- url: mandatory URL to access.
 *	- concurrency: how many concurrent clients to use.
 *	- maxRequests: how many requests to send
 *	- maxSeconds: how long to run the tests.
 *	- cookies: a string or an array of strings, each with name:value.
 *	- headers: a map with headers: {key1: value1, key2: value2}.
 *	- method: the method to use: POST, PUT. Default: GET, what else.
 *	- body: the contents to send along a POST or PUT request.
 *	- contentType: the MIME type to use for the body, default text/plain.
 *	- requestsPerSecond: how many requests per second to send.
 *	- agentKeepAlive: if true, then use connection keep-alive.
 *	- debug: show debug messages.
 *	- quiet: do not log any messages.
 *	- indexParam: string to replace with a unique index.
 *	- insecure: allow https using self-signed certs.
 */

	for(var i in tests)
	{
		var test = tests[i];
		
		loadTest(test);
	}
 
	


}



function loadTest(test)
{	
	var options = {
		url: test.url,
		maxRequests: test.maxRequests,
		concurrency: test.concurrency,
	};

	loadtest.loadTest(options, function(error, result)
	{
		if (error)
		{
			errorHandler(error);
		}

		var outputs = []
		
		var totalRequests = result.totalRequests;
		var totalErrors = result.totalErrors;
		var totalTime = result.totalTimeSeconds;
		var rps = result.rps;
		var meanLatency = result.meanLatencyMs;
		var percentiles = result.percentiles;
		
		var status = totalErrors === totalRequests? 0 : 1;
		
		var completeRequests = totalRequests - totalErrors;
		
		if(status === 1)
		{
			if(metrics['CompleteRequests'].retrieve)
				outputs.push({metricId:metrics['CompleteRequests'].id, targetId:test.targetId, value:completeRequests, object:test.url});
			
			if(metrics['totalErrors'].retrieve)
				outputs.push({metricId:metrics['totalErrors'].id, targetId:test.targetId, value:totalErrors, object:test.url});
			
			if(metrics['totalRequests'].retrieve)
				outputs.push({metricId:metrics['totalRequests'].id, targetId:test.targetId, value:totalRequests, object:test.url});
			
			if(metrics['rps'].retrieve)
				outputs.push({metricId:metrics['rps'].id, targetId:test.targetId, value:rps, object:test.url});
			
			if(metrics['totalTimeSeconds'].retrieve)
				outputs.push({metricId:metrics['totalTimeSeconds'].id, targetId:test.targetId, value:(totalTime.toFixed(2)), object:test.url});
			
			if(metrics['Status'].retrieve)
				outputs.push({metricId:metrics['Status'].id, targetId:test.targetId, value:status, object:test.url});
			
			if(metrics['50'].retrieve)
				outputs.push({metricId:metrics['50'].id, targetId:test.targetId, value:percentiles['50'], object:test.url});
			
			if(metrics['90'].retrieve)
				outputs.push({metricId:metrics['90'].id, targetId:test.targetId, value:percentiles['90'], object:test.url});
			
			if(metrics['95'].retrieve)
				outputs.push({metricId:metrics['95'].id, targetId:test.targetId, value:percentiles['95'], object:test.url});
			
			if(metrics['99'].retrieve)
				outputs.push({metricId:metrics['99'].id, targetId:test.targetId, value:percentiles['99'], object:test.url});
			
			if(metrics['meanLatencyMs'].retrieve)
				outputs.push({metricId:metrics['meanLatencyMs'].id, targetId:test.targetId, value:meanLatency, object:test.url});
		}
		else
		{
			if(metrics['Status'].retrieve)
				outputs.push({metricId:metrics['Status'].id, targetId:test.targetId, value:status, object:test.url});
		}
		
		output(outputs);
		
	});
}
