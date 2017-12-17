const express 	= require('express');
const app 		= express();
const server 	= require('http').createServer(app);
const io 		= require('socket.io')(server);
const jscad = require('@jscad/openjscad')
const fs = require('fs')

var scale 		= require('scale-number-range');
var five 		= require("johnny-five"),
    board 		= new five.Board();




/*
 * Server code. It is used to control the 
 */
app.use(express.static(__dirname + '/public'))
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
});

// app.listen(3000, () => console.log('App is listening on port 3000! (go to http://localhost:3000)'))

/*
 * Johnny-Five code. It is used to control the arduino.
 */
board.on("ready", function() {
	console.log('Arduino is ready.');

	// Change the color of the logo to make it context aware.
    var temp = new five.Sensor({
		pin: "A0",
		// type: "analog",
		freq: 500
	});

	// Calculate the temperature of the Thermistor based on Steinhart–Hart equation - https://en.wikipedia.org/wiki/Thermistor (the values of A, B and C are given by the manufacturer)
    calcTemperature = function(R){
    	A = 0.001129148;
    	B = 0.000234125;
    	C = 0.0000000876741;
    	Rt = Math.log(10000.0 * ((1024.0 / R - 1)));
		return 1/(A + (B + (C * Rt * Rt )) * Rt);
	}

	// Transform Kelvin to Celsius
	KtoC = function(dK){
		return dK - 273.15;
	}


    temp.on("change", function() {	
    	R = this.raw;
    	var temperature = calcTemperature(R);
    	var celsius = KtoC(temperature);
    	console.log("Celsius:" + celsius);

    	//Send values to the web
    	io.emit('temperature', celsius);

    	var colorValue = scale(celsius, 0, 35, 0, 999999);
    	console.log(colorValue);
    	
	});


	io.on('connection', function(client) {
		// Client joined.
	    client.on('join', function(handshake) {
	    console.log(handshake);
    });


    
  });
});

const port = process.env.PORT || 3000;

server.listen(port);
console.log(`Server listening on http://localhost:${port}`);