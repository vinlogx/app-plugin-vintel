/* eslint-disable no-undef */
// Utils
import AWSS3 from './AWS_S3';
import { callback, vintelConfig } from './definitions';
import VintelEvent from './Event/VintelEvent';
import { v4 as uuidv4 } from 'uuid';
import { PLUGIN_VERSION } from './version';

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

const vintelEvent = new VintelEvent();
declare const ble: any;

declare global {
  interface Window {
    device: any;
  }
}

const vintel: any = {
  mode: 'test',
  awsAPIKey: null,
  service: '63DBC55A-1984-4EE5-93C2-3CB06B3BBEB2',
  device: {},
  totalChunks: null,
  readChar: null,
  writeChar: null,
  completeProcess: null,
  scanDataList: [],
  charIndex: 0,
  totalChunkCount: 0,
  event: vintelEvent,
  completeOTA: false,
  oTAVersion: '03.06',
  versionNumber: 0,
  s3Client: null,
  appConfig: null,
  firmwareUpdate: null,
  init: function (config: vintelConfig) {
    return new Promise(async (resolve, reject) => {
      const awsOpts: any = {
        mode: 'dev',
        apiKey: null,
        aws: {
          region: '',
          credentials: {
            accessKeyId: '',
            secretAccessKey: '',
          },
        },
      };
      if (!config) {
        reject('Config is required');
      } else {
        if (config.mode && ['dev', 'prod'].indexOf(config.mode) > -1) {
          awsOpts.mode = config.mode;
          vintel.mode = config.mode;
        }

        if (!config.apiKey) {
          reject('aws apiKey is required');
        } else {
          vintel.awsAPIKey = config.apiKey;
        }

        if (!config.aws) {
          reject('aws config is required');
        } else {
          if (!config.aws.region || config.aws.region === '') {
            reject('aws region config is required');
          }

          if (!config.aws.accessKeyId || config.aws.accessKeyId === '') {
            reject('aws accessKeyId config is required');
          }

          if (!config.aws.secretAccessKey || config.aws.secretAccessKey === '') {
            reject('aws secretAccessKey config is required');
          }
          awsOpts.aws.region = config.aws.region;
          awsOpts.aws.credentials.accessKeyId = config.aws.accessKeyId;
          awsOpts.aws.credentials.secretAccessKey = config.aws.secretAccessKey;
        }
      }

      try {
        vintel.s3Client = new AWSS3(awsOpts);
        let configData = await vintel.s3Client.getConfig();
        configData = JSON.parse(configData);
        vintel.appConfig = configData;
        vintel.oTAVersion = configData.OTAVesrsion || configData.OTAVersion;
        if (config.returnConfig) {
          resolve(configData);
        } else {
          resolve(true);
        }
      } catch (err: any) {
        console.log('AWS Error', err);
        reject(err);
      }
    });
  },
  scan: function (options: any, success: callback, failure: callback) {
    const services = options.services || [];
    const duration = options.seconds || 30;
    const autoConnect = options.autoConnect ? options.autoConnect : true;
    ble.isEnabled(
      function () {
        handleScanning(services, autoConnect, duration, success, failure);
      },
      function () {
        // Let's try to enable it and if succeed, start scanning again
        vintel.event.emit('event', { status: 'error', message: 'Bluetooth Not Enabled.', errorCode: 'C002' });
        ble.enable(
          function () {
            handleScanning(services, autoConnect, duration, success, failure);
          },
          function (err: any) {
            vintel.event.emit('event', {
              status: 'error',
              message: 'Unable to enable Bluetooth Service.',
              errorCode: 'C005',
            });
            failure(err);
          },
        );
      },
    );
  },
  discoverCharacteristics: function (device: any) {
    vintel.device = device;
    const characteristics = device.characteristics || [];
    console.log('characteristics', characteristics);
    for (let i = 0; i < characteristics.length; i++) {
      const characteristic = characteristics[i].characteristic;
      const characteristicUPR = characteristic.toUpperCase();
      // total chunk
      if (characteristicUPR === '771D74EF-369F-41BA-B9B7-E1B5EF790FFA') {
        vintel.totalChunks = characteristic;
        vintel.service = characteristics[i].service;
        vintel.read(
          device.id,
          vintel.service,
          characteristic,
          function (resp: any) {
            console.log('reading response :', resp);
          },
          function (err: any) {
            console.log('read error', err);
          },
        );
      }
      // read
      else if (characteristicUPR === '95D0BF5E-B45D-421F-B613-A0E9C9639C0B') {
        vintel.readChar = characteristic;
      }
      // write
      else if (characteristicUPR === 'E2BE3FEB-46C2-4966-B4E9-79510057A861') {
        vintel.writeChar = characteristic;
      }
      // chunk complete
      else if (characteristicUPR === '7370F836-C589-4EA9-A6E4-267540984446') {
        vintel.completeProcess = characteristic;
      }
      // dfu mode service(imediate alert char)
      else if (characteristicUPR === '2A06') {
        vintel.dfuModeCharactersitc = characteristic;
        vintel.dfuModeServices = characteristics[i].service;
      }
      // firmware version
      else if (characteristicUPR === '2A26') {
        vintel.firmwareVersionCharacteristics = characteristic;
        vintel.firmwareVersionService = characteristics[i].service;
      }
      // firmware version
      else if (characteristicUPR === '2A25') {
        vintel.serialNumberCharacteristics = characteristic;
        vintel.serialNumberVersionService = characteristics[i].service;
      }
      // firmware version
      else if (characteristicUPR === '2A28') {
        vintel.softwareVersionCharacteristics = characteristic;
        vintel.softwareVersionService = characteristics[i].service;
      }
      // DFU characterstics (OTA firmware upgrade characterstics)
      else if (characteristicUPR === '00060001-F8CE-11E4-ABF4-0002A5D5C51B') {
        vintel.otaCharacterstics = characteristics[i];
        // downloadFile();
      }
    }
  },
  connect: function (deviceId: string, success: callback, failure: callback) {
    ble.autoConnect(
      deviceId,
      function (resp: any) {
        vintel.discoverCharacteristics(resp);
        vintel.event.emit('event', { status: 'Connected' });
        success(resp);
      },
      function (err: any) {
        vintel.event.emit('event', { status: 'error', errorCode: 'C003', message: 'Unable to connect to device.' });
        failure(err);
      },
    );
  },
  read: function (
    deviceId: string,
    serviceId: string,
    characteristicUUID: string,
    success: callback,
    failure: callback,
  ) {
    ble.read(
      deviceId,
      serviceId,
      characteristicUUID,
      function (response: any) {
        // If characteristic_uuid matches read, then readn and save data.
        let result = '';
        if (characteristicUUID.toUpperCase() === '771D74EF-369F-41BA-B9B7-E1B5EF790FFA') {
          result = bytesToString(response);
          console.log('read --->', result, '\ncharacteristic : ', characteristicUUID, '\nService:', serviceId);
          vintel.totalChunkCount = result.charCodeAt(0);
        } else {
          result = bytesToString(response);
          vintel.scanDataList.push(result);
        }
        console.log('read result', result, vintel.totalChunkCount, vintel.scanDataList);
        try {
          vintel.event.emit('event', {
            status: 'Reading',
            data: result.indexOf('{') > -1 ? JSON.parse(result) : result,
          });
        } catch (err) {
          console.log('json parse error', err);
        }
        vintel.write(vintel.writeChar, success, failure);
        // success(response)
      },
      function (err: any) {
        vintel.event.emit('event', {
          status: 'error',
          errorCode: 'C008',
          message: 'Unable to read data from the device.',
        });
        failure(err);
      },
    );
  },
  write: function (charUUID: string, success: callback, failure: callback) {
    try {
      console.log('charValue', vintel.charIndex, vintel.totalChunkCount);
      if (vintel.charIndex < vintel.totalChunkCount) {
        const buffres = new Int32Array([vintel.charIndex]).buffer;
        ble.writeWithoutResponse(
          vintel.device.id,
          vintel.service,
          charUUID,
          buffres,
          () => {
            vintel.event.emit('event', { status: 'Writing', data: 'OK' });
            vintel.read(vintel.device.id, vintel.service, vintel.readChar, success, failure);
          },
          (err: any) => {
            vintel.scanDataList = [];
            vintel.event.emit('event', {
              status: 'error',
              errorCode: 'C009',
              message: 'Unable to write data to the device.',
            });
            failure(err);
          },
        );
        // alert("Char Index 0")
        vintel.charIndex++;
      } else {
        vintel.charIndex = 0;
        vintel.totalChunkCount = 0;
        vintel.getVersion(success, failure);
      }
    } catch (err) {
      vintel.scanDataList = [];
      console.log('err', err, vintel);
      failure(err);
    }
  },
  getVersion: function (success: callback, failure: callback) {
    ble.read(
      vintel.device.id,
      vintel.firmwareVersionService,
      vintel.firmwareVersionCharacteristics,
      (response: ArrayBuffer) => {
        const base64Value = arrayBufferToBase64(response);
        const b = atob(base64Value);
        vintel.versionNumber = b.toString();
        console.log(
          'Complet OTA_______' + vintel.completeOTA + ' !!! ' + vintel.oTAVersion + ' !!! ' + vintel.versionNumber,
        );
        if (vintel.completeOTA === false) {
          console.log('Sending Data');
          vintel.event.emit('event', { status: 'SendComplete' });

          // vintel.completeChunk(function (resp) {
          // console.log("chunk completed", resp)
          vintel.sendData(success, failure);
          // }, failure);
        } else {
          vintel.completeOTA = false;
          console.log('Device Update SUCCESS_____________________________' + vintel.completeOTA);
          success(response);
          vintel.completeChunk(success, failure);
        }
      },
      function (err: any) {
        vintel.event.emit('event', {
          status: 'error',
          errorCode: 'C008',
          message: 'Unable to read data from the device.',
        });
        failure(err);
      },
    );
  },
  disconnect: function (success: callback, failure: callback) {
    ble.disconnect(
      vintel.device.id,
      () => {
        console.log('disconnect Device _________________________' + vintel.completeOTA + ' !!');
        vintel.event.emit('event', { status: 'Disconnected' });
        success();
      },
      function (err: any) {
        console.log('Disconnect Error', err);
        vintel.event.emit('event', { status: 'error', errorCode: 'C010', message: 'Unable disconnect device.' });
        failure(err);
      },
    );
  },
  completeChunk: function (success: callback, failure: callback) {
    try {
      const buffers = new Int32Array([0x01]).buffer;
      ble.writeWithoutResponse(
        vintel.device.id,
        vintel.service,
        vintel.completeProcess,
        buffers,
        () => {
          success();
        },
        function (err: any) {
          vintel.scanDataList = [];
          failure(err);
        },
      );
    } catch (err: any) {
      vintel.scanDataList = [];
      failure(err);
    }
  },
  sendData: async function (success: callback, error: callback) {
    const device: any = window.device as any;
    let scanresult = '';
    console.log('Scan Result', vintel.scanDataList);
    vintel.scanDataList.forEach((item: string) => {
      scanresult += item;
    });

    const lastIndexRemove = scanresult.lastIndexOf('}');
    const finalscanJsonString = scanresult.slice(0, lastIndexRemove);

    const promise = new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError);
      function onSuccess(position: any) {
        resolve(position);
      }
      function onError(error: any) {
        console.log('onError Location =>', error);
        resolve(400);
      }
    });

    let latitude;
    let longitude;
    const result: any = await promise;
    if (result !== 400) {
      if (window.location.port === '8100') {
        latitude = '40.0583';
        longitude = '74.4057';
      } else {
        latitude = result.coords.latitude;
        longitude = result.coords.longitude;
      }
    } else {
      latitude = 0;
      longitude = 0;
    }

    let deviceType;
    // const today = new Date();
    // const dateValue = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    // const time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
    // const dateTime = dateValue + ' ' + time;
    // const timeStamp = dateTime;
    const timeStamp = new Date().toISOString();
    const refId = uuidv4();

    if (device.deviceType === true) {
      deviceType = 'Physical';
    } else {
      deviceType = 'Virtual';
    }
    const deviceInfo = {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      model: device.model,
      manufacturer: device.manufacturer,
      deviceType,
      versionString: device.version,
      timeStamp,
      serialNumber: device.uuid,
      platform: device.platform,
      appType: 'Cordova-Plugin',
      pluginVer: PLUGIN_VERSION,
    };
    const softwareVersionNumber = deviceInfo.versionString;
    const deviceData = {
      device: deviceInfo,
    };
    let deviceDetails = JSON.stringify(deviceData);
    // var deviceDetailsBadJSON = JSON.stringify(deviceData)

    deviceDetails = deviceDetails.slice(1);
    deviceDetails = deviceDetails.slice(0, -1);
    const lastIndexDeviceInfo = deviceDetails.lastIndexOf('}');
    deviceDetails = deviceDetails.slice(0, lastIndexDeviceInfo);

    let finalData: any = finalscanJsonString.trim() + ',' + deviceDetails + '}' + '}';

    //  alert("position => " + JSON.stringify(finalData))
    //   module.exports.stopScan(function () { }, function () { });
    // let isDataSent = false;

    // This Point Arr Break Condition Send Data
    const tempNavigator = navigator as any;
    const noConnection = tempNavigator.connection && tempNavigator.connection.type === 'none';
    if (noConnection) {
      vintel.event.emit('event', {
        status: 'error',
        message: 'No Internet!',
        errorCode: 'C001',
      });
      error({ message: 'No internet connection!' });

      // let timesRun = 0;
      const interval = setInterval(() => {
        // timesRun += 1;
        if (noConnection) {
          clearInterval(interval);
          error({ message: 'retrying submit' });
          // isDataSent = true;
          try {
            console.log('Sending 1', finalData);
            // postAdvanceHttp(finalData, success);
          } catch (e) {
            //  alert(constant.Message.c019_unableToProcessDataToGenerateDSR);
            finalData =
              finalscanJsonString
                .slice(11)
                .replace(/[&/\\#+()$~%.'"*?<>]/g, '')
                .trim() +
              ',' +
              deviceDetails +
              '}' +
              '}';

            finalData = {
              mod: { mid: deviceInfo.serialNumber, ver: vintel.versionNumber, sfw: softwareVersionNumber },
              vehicle: finalscanJsonString
                .slice(11)
                .replace(/[&/\\#+()$~%.'"*?<>]/g, '')
                .trim(),
              device: deviceInfo,
              referenceId: refId,
            };
            console.log('Sending 1 error', finalData);
            // postAdvanceHttp1(JSON.stringify(finalData), callback);
          }
        } else {
          error({ message: 'retrying submit. No internet connection' });
        }
      }, 20000);
    } else {
      try {
        // JSON.parse(finalData)
        const tempFinalData: any = JSON.parse(finalData);
        tempFinalData.referenceId = refId;
        console.log('Sending 3', finalData);
        // await postAdvanceHttp(finalData, callback);
        vintel.event.emit('event', {
          status: 'AWSRequest',
          data: tempFinalData,
        });
        const response = await httpRequest(0, JSON.stringify(tempFinalData));

        vintel.event.emit('event', {
          status: 'AWSResponse',
          data: { AWSResponse: response, timeStamp, referenceId: refId },
        });
        console.log('AWS response: ', response);
        vintel.checkOTA(success, error);
      } catch (e: any) {
        finalData =
          finalscanJsonString
            .slice(11)
            .replace(/[&/\\#+()$~%.'"*?<>]/g, '')
            .trim() +
          ',' +
          deviceDetails +
          '}' +
          '}';
        finalData = {
          mod: { mid: deviceInfo.serialNumber, ver: vintel.versionNumber, sfw: softwareVersionNumber },
          vehicle: finalscanJsonString
            .slice(11)
            .replace(/[&/\\#+()$~%.'"*?<>]/g, '')
            .trim(),
          device: deviceInfo,
          referenceId: refId,
        };
        // postAdvanceHttp1(JSON.stringify(finalData), callback);
        console.log('sending 3 err', e, finalData);
        vintel.event.emit('event', { status: 'error', errorCode: 'C011', message: 'Unable to send data to server.' });
        vintel.event.emit('event', {
          status: 'AWSError',
          data: { message: e.message },
        });
      }
    }
  },
  checkOTA: function (success: callback, failure: callback) {
    console.log(
      'Check Ota Version ____________________________________' + vintel.oTAVersion + '!=   ' + vintel.versionNumber,
    );
    if (vintel.oTAVersion !== vintel.versionNumber && !true) {
      // force to continue without version update
      // Confirm Dialog needs to be shown
      vintel.event.emit('event', {
        status: 'OTA-Update',
        data: { OTAVersion: vintel.oTAVersion, version: vintel.versionNumber },
      });
      failure({ message: 'Action need for OTA update.' });
    } else {
      console.log('Equal Ota Version ' + vintel.oTAVersion + '!=   ' + vintel.versionNumber);
      // alert("Invalid DSR scan data found Please restart the module and try again")
      vintel.event.emit('event', {
        status: 'OTA-UPToDate',
        data: { OTAVersion: vintel.oTAVersion, version: vintel.versionNumber },
      });

      // No Update available, so just send data to AWS and send complete request to device.
      continueProcess(success, failure);
    }
  },
  OTAUpdate: function (update?: boolean) {
    console.log('OTA Action', update);
    if (update === undefined || update === true) {
      // Need to update
    } else {
      continueProcess(
        function (resp: any) {
          console.log('Inside OTA', resp);
        },
        function (err: any) {
          console.log('OTA Error', err);
        },
      );
    }
  },
  stopScan: function (success?: callback, error?: callback, message?: string, errorCode?: string) {
    ble.stopScan(
      function () {
        const data: any = { status: 'ScanningStopped', data: 'Scanning Stopped' };
        if (message) {
          data.data = message;
        }
        if (errorCode) {
          data.errorCode = errorCode;
        }

        vintel.event.emit('event', data);
        if (typeof success === 'function') {
          success();
        }
      },
      function (err: any) {
        console.log('Scanning Stop Error');
        if (typeof error === 'function') {
          error(err);
        }
      },
    );
  },
};

function continueProcess(success: callback, failure: callback) {
  vintel.completeChunk(function (resp: any) {
    console.log('chunk completed', resp);
    // vintel.sendData(success, failure);
    setTimeout(() => {
      vintel.disconnect(function (resp: any) {
        vintel.device = {};
        console.log('Scanning from Check OTA');
        vintel.scanDataList = [];
        vintel.totalChunkCount = 0;
        vintel.scan(
          { autoConnect: true },
          function (resp1: any) {
            console.log('Scanning again', resp1);
          },
          failure,
        );
      }, failure);
    }, 5000);
  }, failure);
}

function handleScanning(
  services: string[],
  autoConnect: boolean,
  duration: number,
  success: callback,
  failure: callback,
) {
  const scanPromise = new Promise(function (resolve, reject) {
    const devicesArr = [];
    const devicesNameArr: any = [];
    const vintelDevices = ['VinTel_OBD2', 'Vintel_DFU'];
    const vintelDevicesList: any = [];
    vintel.event.emit('event', { status: 'Scanning' });
    const scanStopHandlerAdded = false;
    ble.startScan(
      services,
      async function (device: any) {
        if (!devicesNameArr.includes(device.name)) {
          // vintel.event.emit("any", { status: "deviceFound", data: device })
          devicesArr.push(device);
          devicesNameArr.push(device.name);
          if (vintelDevices.indexOf(device.name) > -1) {
            vintel.event.emit('event', { status: 'DeviceFound', data: device });
            vintelDevicesList.push(device);
            vintel.stopScan(null, null, 'VinTel Device found');
            resolve({ devices: vintelDevicesList });
          }

          // if (!scanStopHandlerAdded) {
          //   setTimeout(function () {
          //     if (!vintelDevicesList.length) {
          //       vintel.stopScan(null, null, 'No VinTel Module/Device found.', 'C004');
          //       resolve({ devices: [] });
          //     }
          //   }, duration * 1000);
          //   scanStopHandlerAdded = true;
          // }
        }
      },
      function (error: any) {
        vintel.event.emit('event', { status: 'error', errorCode: 'C007', message: 'Device scanning failed' });
        reject(error);
      },
    );
    // setTimeout(function () {
    //   vintel.event.emit("any", { status: "ScanningStopped", data: vintelDevices })
    //   resolve({ devices: vintelDevicesList });
    // }, duration * 1000);
  });
  scanPromise
    .then(function (resp: any) {
      if (autoConnect && resp.devices.length) {
        ble.connect(
          resp.devices[0].id,
          function (resp: any) {
            vintel.event.emit('event', { status: 'Connected', device: resp });
            vintel.discoverCharacteristics(resp);
            success(resp);
          },
          function (err: any) {
            vintel.event.emit('event', { status: 'Disconnected', error: err });
          },
        );
      } else {
        success(resp);
      }
    })
    .catch(function (err) {
      failure(err);
    });
}

// ASCII only
function bytesToString(buffer: any) {
  // return String.fromCharCode.apply(null, new Uint8Array(buffer));
  return String.fromCharCode(...new Uint8Array(buffer));
}

// eslint-disable-next-line no-unused-vars
function sendDataToAWS(data: any) {
  const xmlhttp = new XMLHttpRequest(); // new HttpRequest instance
  const url = 'https://sz5hnn73y4.execute-api.us-east-2.amazonaws.com/prod/sqs';
  xmlhttp.open('POST', url);
  xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xmlhttp.setRequestHeader('us-east-2_e1BEH0iiW', 'WTFQJFduva8NSR0wPuWFI952Mr2q2JQVaVC9oBbI');
  xmlhttp.send(JSON.stringify(data));
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === 4) {
      let response = null;
      if (xmlhttp.status === 200) {
        response = JSON.parse(xmlhttp.responseText);
        console.log(response);
      } else {
        // error case
        response = xmlhttp.statusText;
      }
    }
  };
}

const httpRequest = async (type: number, data: any) => {
  const url = vintel.appConfig.SQSUrl;
  const headers: any = { 'Content-Type': 'application/json' };
  if (vintel.mode === 'dev' || (vintel.mode === 'prod' && vintel.awsAPIKey)) {
    headers['x-api-key'] = vintel.awsAPIKey;
  }
  if (type === 1) {
    // need to handle here
  }

  return new Promise(function (resolve, reject) {
    const xmlhttp = new XMLHttpRequest(); // new HttpRequest instance
    xmlhttp.open('POST', url);
    if (headers && Object.keys(headers).length) {
      Object.keys(headers).forEach(key => {
        xmlhttp.setRequestHeader(key, headers[key]);
      });
    }
    xmlhttp.send(data);
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState === 4) {
        let response = null;
        if (xmlhttp.status === 200) {
          response = JSON.parse(xmlhttp.responseText);
          resolve(response);
        } else {
          // error case
          response = xmlhttp.statusText;
          reject(response);
        }
      }
    };
  });
};

export default vintel;
