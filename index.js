const services = {
    ufrService: {
        name: 'ufr service',
        uuid: 'e7f9840b-d767-4169-a3d0-a83b083669df'
    }
}


const characteristics = {
    ufrCharacteristic: {
        name: 'ufr characteristic',
        uuid: '8bdc835c-10fe-407f-afb0-b21926f068a7'
    }
}
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let beepButton = document.getElementById('beep');
let getuidButton = document.getElementById('getuid');

connectButton.addEventListener('click', function() {
    connect();
});

disconnectButton.addEventListener('click', function() {
    disconnect();
});

beepButton.addEventListener('click', function() {
    beep();
});

getuidButton.addEventListener('click', function() {
    get_uid();
});





let deviceCache = null;

let characteristicCache = null;

function connect() {
    return (deviceCache ? Promise.resolve(deviceCache) :
        requestBluetoothDevice()).
    then(device => connectDeviceAndCacheCharacteristic(device)).
    catch(error => console.log(error));
}

function requestBluetoothDevice() {
    console.log('Requesting uFR Online scan');

    return navigator.bluetooth.requestDevice({
        filters: [{
                namePrefix: 'ON'
            },
            {
                services: [services.ufrService.uuid]
            }
        ]
    }).
    then(device => {
        console.log('uFR Online ' + device.name + ' selected');
        deviceCache = device;
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
    });
}

function handleDisconnection(event) {
    let device = event.target;

    console.log('Disconnected from uFR Online ' + device.name);
	document.getElementById("status").innerHTML = "Status: Disconnected";
    connectDeviceAndCacheCharacteristic(device).
    catch(error => console.log(error));
	
}

function connectDeviceAndCacheCharacteristic(device) {
    if (device.gatt.connected && characteristicCache) {
        return Promise.resolve(characteristicCache);
    }

    console.log('Connecting to uFR Online ' + device.name);
	document.getElementById("status").innerHTML = "Status: Connecting...";

    return device.gatt.connect().
    then(server => {

        return server.getPrimaryService(services.ufrService.uuid);
    }).
    then(service => {

        return service.getCharacteristic(characteristics.ufrCharacteristic.uuid);
    }).
    then(characteristic => {
        console.log('Connected to uFR Online ' + device.name);
		document.getElementById("status").innerHTML = "Status: Connected";
        characteristicCache = characteristic;

        return characteristicCache;
    });
}




function disconnect() {
    if (deviceCache) {
        console.log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
        deviceCache.removeEventListener('gattserverdisconnected',
            handleDisconnection);

        if (deviceCache.gatt.connected) {
            deviceCache.gatt.disconnect();
            console.log('"' + deviceCache.name + '" bluetooth device disconnected');
			document.getElementById("status").innerHTML = "Status: Disconnected";


        } else {
            console.log('"' + deviceCache.name +
                '" bluetooth device is already disconnected');
        }
    }

    if (characteristicCache) {

        characteristicCache = null;
    }

    deviceCache = null;
}

function send(funcArray, responseLen) {

    var lenArray = new Uint8Array(6);
    lenArray[0] = 0x4C;
    lenArray[1] = 0x45;
    lenArray[2] = 0x4E;
    lenArray[3] = 0x3D;
    lenArray[4] = 0x00;
    lenArray[5] = responseLen;



    characteristicCache.writeValue(funcArray).then(function() {

       // console.log(byteToHexString(funcArray) + " sent (FUNCTION)");

        characteristicCache.writeValue(lenArray).then(function() {

           // console.log(byteToHexString(lenArray) + " sent (RESPONSE LEN)");

            characteristicCache.readValue().then(function(dataView) {
                var response = new Uint8Array(dataView.buffer);
                //console.log("Response: " + byteToHexString(response));
				
				if(funcArray[1] == 0x26)
				{
					console.log("Beep");
				}
				
				if(funcArray[1] == 0x2C && response[0] == 0xDE)
				{
					let uid_len = response[5];
					let uid = '';
					for (var i = 0; i < uid_len; i++) {
						var hex = (response[7+i] & 0xff).toString(16);
						hex = (hex.length === 1) ? '0' + hex : hex;
						uid += hex;
					}
					document.getElementById("uid").innerHTML = "UID: " + uid.toUpperCase();
					console.log("UID: " + uid.toUpperCase());					
				}
				
				if(funcArray[1] == 0x2C && response[0] == 0xEC && response[1] == 0x08)
				{
					document.getElementById("uid").innerHTML = "NO CARD";
					console.log("NO CARD");	
				}
				
            });

        });

    });
}

function beep()
{
	var funcArray = new Uint8Array(7);
    funcArray[0] = 0x55;
    funcArray[1] = 0x26;
    funcArray[2] = 0xAA;
    funcArray[3] = 0x00;
    funcArray[4] = 0x01;
    funcArray[5] = 0x01;
    funcArray[6] = 0xe0;
	
	send(funcArray, 7);
	
}

function get_uid()
{
	
	var funcArray = new Uint8Array(7);
    funcArray[0] = 0x55;
    funcArray[1] = 0x2C;
    funcArray[2] = 0xAA;
    funcArray[3] = 0x00;
    funcArray[4] = 0x00;
    funcArray[5] = 0x00;
    funcArray[6] = 0xDA;
	
	send(funcArray, 18);
}

function get_uid_loop()
{
	
 var uidLoopInterval =  setInterval(function() {
		get_uid();
  }, 400);
}

function byteToHexString(uint8arr) {
    if (!uint8arr) {
        return '';
    }

    var hexStr = '';
    for (var i = 0; i < uint8arr.length; i++) {
        var hex = (uint8arr[i] & 0xff).toString(16);
        hex = (hex.length === 1) ? '0' + hex : hex;
        hexStr += hex;
    }

    return hexStr.toUpperCase();
}