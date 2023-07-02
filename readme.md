
  # Installation  
  Simply install the plugin with following command
  ````
  npm i vintel-cordova
  ````
  The plugin has depecency on `cordova-plugin-ble-central`, which can be installed based on instructions mentioned in following repository
  https://github.com/don/cordova-plugin-ble-central

  For the Cordova project you can install the plugin as given below (for more info, kindly check the plugin repository)
  ````
  $ cordova plugin add cordova-plugin-ble-central --variable BLUETOOTH_USAGE_DESCRIPTION="Your description here" --variable IOS_INIT_ON_LOAD=true|false --variable BLUETOOTH_RESTORE_STATE=true|false --variable ACCESS_BACKGROUND_LOCATION=true|false
  ````
  
  ## Methods
  The plugin offers following Methods:
  
  1. init
  2. scan
  3. connect
  4. read
  5. write
  6. disconnect

  Complete usage for the functions is given below

  ### 1. init 
  This function is used to initialize the plugin
  ```
  .... // other package import
  const vintel = require("vintel-cordova").default
  ....
  // config is optional, bydefault it will use the necessary config required to work with vintel modules
  const config = {
      mode: "prod", // or dev,
      aws: {
          region: '{aws-region}', // e.g. us-east-2
          credentials: {
            accessKeyId: '{aws-access-key-Id}',
            secretAccessKey: '{aws-secret-access-key}',
          },
        },
  }

  vintel.init(config);
  // or without config
  vintel.init(); 
  ```
  ### 2. scan
  This method is used to scan and connect to avaialble Vintel BLE Modules
  e.g.
  ````
  const scanConfig = {
    autoConnect: true, // or false
    seconds: 30, // default is 30, numeric value for duration to scan 
    services: [], // array of services you want to search
  }
  vintel.scan(scanConfig, successCallback, errorCallback);
  or
  vintel.scan({}, successCallback, errorCallback);

  function successCallback(response){
    console.log({response});
  } 

  function errorCallback(error){
    console.log({error})
  }
  ````

This plugin offers read, write and disconnect function as well but handled automatically by plugin for best pactices.

## Events
This plugin offer events which can be used for to listening to various events.
e.g.
````
// initialize
vintel.init();
// start listening
vintel.event.on("any", (event: any) => {
  switch (event.status) {
    case "Connected":
      console.log("event", event);
      break;
    case "AWSRequest":
      console.log("event", event);
      break;
    case "AWSResponse":
      console.log("event", event);
      break;
    case "Disconnected":
      console.log("event", event);
      break;
    case "OTA-Update":
      console.log("event", event);
      break;
    case "AWSError":
      console.log("event", event);
      break;
    default:
      break;
  }
});
````
Following events are avaialble
```
Status 	         |     Data	              |    Description
-------------------------------------------------------------
Scanning		                            Device is Scanning for Vintel Device
DeviceFound	                                    Device Object	
ScanningStopped		                            Device had stopped scanning
Connected		                            Device Connected
Reading	                                            Data received on read	Data from the BLE service
Writing	            Response after writing data	    Data writing to BLE
AWSRequest	    Payload sent on AWS	Sending     Data to AWS
AWSResponse	    Received response from AWS 	    Response from AWS
AWSError	    Error received from AWS.	    Error while sending to AWS
OTAUpdate		                            Checking Update
OTA-uptodate		                            No update available
SendComplete		                            Sending instruction to device about completion
Disconnected		                            Device Disconnected
error		                                    Provides info about errors. Check the error codes for more info. 

```

Following are error codes which are sent by plugin, in case of any error

```
Error Code    |      Message	                          |        Description
---------------------------------------------------------------------------------------------------------
C001	            No Internet!	                          There is not current internet connection. At this time, the device is required to have internet connection to upload to VINTEL cloud.
C002	            Bluetooth Not Enabled.	                  Bluetooth is not enabled The Bluetooth on the device is not enabled
C003	            Unable to connect to device.	          Unable to connect to the module Bluetooth detects VINTEL module but is unsuccessful connecting.
C004	            No Vintel Module/Device found.	          No module found to connect to. No VINTEL module detected.
C005	            Unable to enable Bluetooth Service.	          Unable to enable Bluetooth Bluetooth permission issue.
C006	            If Any non-generic error occurred. 	          Something went wrong Fallback.
C007	            Device scanning failed	                  Unable to scan for module.
C008	            Unable to read data from the device.	  Unable to read data from module.
C009	            Unable to write data to the device.	          Unable to append/write to module data.
C010	            Unable disconnect device.	                  Unable to disconnect from module.
C011	            Unable to send data to server.	          Unable to send data to VINTEL cloud.

```

For any issue of query, you can file bugs at:
https://github.com/fullstack202/vintel-cordova/issues
 
