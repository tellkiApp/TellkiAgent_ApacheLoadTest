/*
 This script was developed by Guberni and is part of Tellki's Monitoring Solution

 February, 2015
 
 Version 1.0
 
 DEPENDENCIES:
		loadtest v1.2.6 (https://www.npmjs.com/package/loadtest)

 DESCRIPTION: Monitor Apache Load Test utilization

 SYNTAX: node apache_load_test_monitor.js <METRIC_STATE> <CIR_IDS> <PARAMS>
 
 EXAMPLE: node apache_load_test_monitor.js "1,1,1,1,1,1,1,1,1,1,1" "2394" "new;http://www.apache.org#100#5"

 README:
		<METRIC_STATE> is generated internally by Tellki and it's only used by Tellki default monitors.
		1 - metric is on ; 0 - metric is off

		<CIR_IDS> is generated internally by Tellki and its only used by Tellki default monitors

		<PARAMS> are 4 fields separeted by "#" and it contains the monitor's configuration, is generated internally
		by Tellki and it's only used by Tellki's default monitors.
*/

var loadtest = require('loadtest');


/*
* METRICS IDS
* List with all metrics to be retrieved.
*
* Attribute "id" represents the metric id
* Attribute "retrieve" represents the metric state
*/
var metrics = []

metrics["CompleteRequests"] = {id:"125:Complete Requests:4", retrieve:false};
metrics["totalErrors"] = {id:"219:Failed Requests:4", retrieve:false};
metrics["totalRequests"] = {id:"217:Total Requests:4", retrieve:false};
metrics["rps"] = {id:"156:Requests/Sec:4", retrieve:false};
metrics["50"] = {id:"122:50th Percentile Response Time:4", retrieve:false};
metrics["90"] = {id:"30:90th Percentile Response Time:4", retrieve:false};
metrics["95"] = {id:"67:95th Percentile Response Time:4", retrieve:false};
metrics["99"] = {id:"203:99th Percentile Response Time:4", retrieve:false};
metrics["meanLatencyMs"] = {id:"118:Mean Response Time:4", retrieve:false};
metrics["totalTimeSeconds"] = {id:"84:Total Time:4", retrieve:false};
metrics["Status"] = {id:"87:Status:9", retrieve:false}; 



// ############# INPUT ###################################

//START
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
			process.exit(err.code);
		}
		else
		{
			console.log(err.message);
			process.exit(1);
		}
	}
}).call(this)


/*
* Verify number of passed arguments into the script.
*/
function monitorInput(args)
{
	
	if(args.length != 3)
	{
		throw new InvalidParametersNumberError()
	}		
	
	monitorInputProcess(args);
}

/*
* Process the passed arguments and send them to monitor execution (monitorApacheLoadTest)
* Receive: arguments to be processed
*/
function monitorInputProcess(args)
{	
	//<METRIC_STATE>  
	var metricState = args[0].replace("\"", "");
	
	var tokens = metricState.split(",");

	var metricsName = Object.keys(metrics);
	
	for(var i in tokens)
	{
		metrics[metricsName[i]].retrieve = (tokens[i] === "1")
	}
	
	
	//<CIR_IDS>
	var targetsTest = args[1].split(",");
	
	//<PARAMS>
	var testsArgs = args[2].split(",");
	
	//create tests to pass to the monitor
	var tests = [];
	
	for(var i in testsArgs)
	{
		var t = testsArgs[i].split("#");
		
		var test = new Object()
		test.url = t[0].split(";")[1];
		test.maxRequests = t[1];
		test.concurrency = t[2];
		test.targetId = targetsTest[i]
		
		tests.push(test);
	}

	//call monitor
	monitorApacheLoadTest(tests);
	
}



// ################# APACHE LOAD TEST ###########################
/*
* Tests executer
* Receive: Test's list
*/
function monitorApacheLoadTest(tests) 
{
	for(var i in tests)
	{
		var test = tests[i];
		
		loadTest(test);
	}
}


/*
* Retrieve metrics information
* Receive: object test
*/
function loadTest(test)
{	
	/**
	* Options is an object which may have:
	* - url: mandatory URL to access.
	* - concurrency: how many concurrent clients to use.
	* - maxRequests: how many requests to send
	* - maxSeconds: how long to run the tests.
	* - cookies: a string or an array of strings, each with name:value.
	* - headers: a map with headers: {key1: value1, key2: value2}.
	* - method: the method to use: POST, PUT. Default: GET, what else.
	* - body: the contents to send along a POST or PUT request.
	* - contentType: the MIME type to use for the body, default text/plain.
	* - requestsPerSecond: how many requests per second to send.
	* - agentKeepAlive: if true, then use connection keep-alive.
	* - debug: show debug messages.
	* - quiet: do not log any messages.
	* - indexParam: string to replace with a unique index.
	* - insecure: allow https using self-signed certs.
	*/
	var options = {
		url: test.url,
		maxRequests: test.maxRequests,
		concurrency: test.concurrency,
	};

	//Execute test
	loadtest.loadTest(options, function(error, result)
	{
		//on request error
		if (error)
		{
			errorHandler(error);
		}

		//output list
		var outputs = []
		
		//get test information from result
		var totalRequests = result.totalRequests;
		var totalErrors = result.totalErrors;
		var totalTime = result.totalTimeSeconds;
		var rps = result.rps;
		var meanLatency = result.meanLatencyMs;
		var percentiles = result.percentiles;
		var completeRequests = totalRequests - totalErrors;
		
		//status checker. 0 if number of erros equals to number of requests made in test, 1 otherwise
		var status = totalErrors === totalRequests? 0 : 1;
		
		/*
		* create output according to status and metric state
		*/
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


//################### OUTPUT METRICS ###########################

/*
* Send metrics to console
* Receive: metrics list to output
*/
function output(outputs)
{
	for(var i in outputs)
	{
		var out = "";
		
		var output = outputs[i];
		
		out += output.metricId;
		out += "|";
		out += output.targetId;
		out += "|";
		out += output.value
		out += "|";
		out += output.object
		out += "|";
		
		console.log(out);
	}
	
}


//################### ERROR HANDLER #########################

/*
* Used to handle errors of async functions
* Receive: Error/Exception
*/
function errorHandler(err)
{
	console.log(err.message);
	process.exit(1);
}



//####################### EXCEPTIONS ################################

//All exceptions used in script

function InvalidParametersNumberError() {
    this.name = "InvalidParametersNumberError";
    this.message = ("Wrong number of parameters.");
	this.code = 3;
}
InvalidParametersNumberError.prototype = Object.create(Error.prototype);
InvalidParametersNumberError.prototype.constructor = InvalidParametersNumberError;

