const express 	= require('express');
const app 		= express();
const server 	= require('http').createServer(app);
const io 		= require('socket.io')(server);

var bezier		= require("bezier-js");
var scale 		= require('scale-number-range');
var five 		= require("johnny-five"),
    board 		= new five.Board();

const fs = require('fs')



/*
 * Generate the server and communication between client and server
 */
app.use(express.static(__dirname + '/public'))
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
});

const port = process.env.PORT || 3000;
server.listen(port);
console.log(`Server listening on http://localhost:${port}`);

// Confirm that client (user from the browser) and server (this file) are communicating.
io.on('connection', function(client) {
	
	// Client joined.
	// Handshake function confirms that a client has joined.
    client.on('join', function(handshake) {
    console.log(handshake);
	});

    // This function executes everytime the user clicks the big blue button.
    client.on('clickevento', function(data) {
		
    	// number of slices we use to create the 3D model.
    	// It is also the number of points we generate in our Bezier curves in order to have the same amount
		numberOfSlices = Math.round(data.height*1.5) || 75;


		// Generates random positions for each point of the Bezier Curve.
		// We are using Bezier Curves because it is easier to gnerate an uniform and random number distribution with this method.
		// First we create 2 random points and 2 random control points, then the curve and divide it into the slices that we are gonna generate.
		// Finally 
		var x1 = Math.floor(Math.random() * 200) + 1;
		var x2 = Math.floor(Math.random() * 200) + 1;
		var x3 = Math.floor(Math.random() * 200) + 1;
		var x4 = Math.floor(Math.random() * 200) + 1;
		
		var y1 = Math.floor(Math.random() * 200) + 1;
		var y2 = Math.floor(Math.random() * 200) + 1;
		var y3 = Math.floor(Math.random() * 200) + 1;
		var y4 = Math.floor(Math.random() * 200) + 1;

		var curve = new bezier(x1,y1 , x2,y2 , x3,y3 , x4,y4);	// Here we create the curve.

		// Here we create the array (list of values) and prepare them to send to our 3D Model.
		var scaleValues = [];
		var rotationValues = [];
		var LUT = curve.getLUT(numberOfSlices);
		LUT.forEach(function(p) { 
			scaleValues.push(scale(p.x,0,200,0.7,1.3));			// Scale down the result and store them in the array.
			rotationValues.push(scale(p.y,0,200,0.7,1.3));  	// Scale down the result and store them in the array.
		});

		
		// To scale the rgb values to set the color of our object.
		var rgb = data.hex.match(/\d+/g);
		R = scale(rgb[0],0,255,0,1) || 0.8;
		G = scale(rgb[1],0,255,0,1) || 0.2;
		B = scale(rgb[2],0,255,0,1) || 0.3;

		// Check that the colors are not black (in case the sensor is not)
		if (R === 0) {R = 0.8};
		if (G === 0) {G = 0.2};
		if (B === 0) {B = 0.3};

		// Send color, scale and rotation to our figure in order to update it
		io.emit('dataForParameters', {R: R, G: G, B: B, sValues: scaleValues, rValues: rotationValues });

		});

});


/*
 * Johnny-Five code. It is used to control the arduino board.
 */
board.on("ready", function() {
	
	// Print the message that arduino is connected and working
	console.log('Arduino is ready.');

	
	// Change the color of the figure to make it context aware.
	// It can be seen in the logo changing color.
    var sensorValue= new five.Sensor({
		pin: "A0",
		freq: 500		// checks every 500 miliseconds the sensor Value. It can be changed.
	});


	// Translates thermistor values to Kelvins
	// based on Steinhart–Hart equation - https://en.wikipedia.org/wiki/Thermistor
	// (the values of A, B and C are given by the manufacturer)
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


	// Array that contains a range of colors based on the Mitchell Charity table - http://www.vendian.org/mncharity/dir3/blackbody/UnstableURLs/bbr_color.html
	// There is no physical tool to transform temparature to color, so we use black body theory as a reference - https://en.wikipedia.org/wiki/Black_body
	var colors = { 1000: "#ff3300", 1050: "#ff3800", 1100: "#ff4500", 1150: "#ff4700", 1200: "#ff5200", 1250: "#ff5300", 1300: "#ff5d00", 1350: "#ff5d00", 1400: "#ff6600", 1450: "#ff6500", 1500: "#ff6f00", 1550: "#ff6d00", 1600: "#ff7600", 1650: "#ff7300", 1700: "#ff7c00", 1750: "#ff7900", 1800: "#ff8200", 1850: "#ff7e00", 1900: "#ff8700", 1950: "#ff8300", 2000: "#ff8d0b", 2050: "#ff8912", 2100: "#ff921d", 2150: "#ff8e21", 2200: "#ff9829", 2250: "#ff932c", 2300: "#ff9d33", 2350: "#ff9836", 2400: "#ffa23c", 2450: "#ff9d3f", 2500: "#ffa645", 2550: "#ffa148", 2600: "#ffaa4d", 2650: "#ffa54f", 2700: "#ffae54", 2750: "#ffa957", 2800: "#ffb25b", 2850: "#ffad5e", 2900: "#ffb662", 2950: "#ffb165", 3000: "#ffb969", 3050: "#ffb46b", 3100: "#ffbd6f", 3150: "#ffb872", 3200: "#ffc076", 3250: "#ffbb78", 3300: "#ffc37c", 3350: "#ffbe7e", 3400: "#ffc682", 3450: "#ffc184", 3500: "#ffc987", 3550: "#ffc489", 3600: "#ffcb8d", 3650: "#ffc78f", 3700: "#ffce92", 3750: "#ffc994", 3800: "#ffd097", 3850: "#ffcc99", 3900: "#ffd39c", 3950: "#ffce9f", 4000: "#ffd5a1", 4050: "#ffd1a3", 4100: "#ffd7a6", 4150: "#ffd3a8", 4200: "#ffd9ab", 4250: "#ffd5ad", 4300: "#ffdbaf", 4350: "#ffd7b1", 4400: "#ffddb4", 4450: "#ffd9b6", 4500: "#ffdfb8", 4550: "#ffdbba", 4600: "#ffe1bc", 4650: "#ffddbe", 4700: "#ffe2c0", 4750: "#ffdfc2", 4800: "#ffe4c4", 4850: "#ffe1c6", 4900: "#ffe5c8", 4950: "#ffe3ca", 5000: "#ffe7cc", 5050: "#ffe4ce", 5100: "#ffe8d0", 5150: "#ffe6d2", 5200: "#ffead3", 5250: "#ffe8d5", 5300: "#ffebd7", 5350: "#ffe9d9", 5400: "#ffedda", 5450: "#ffebdc", 5500: "#ffeede", 5550: "#ffece0", 5600: "#ffefe1", 5650: "#ffeee3", 5700: "#fff0e4", 5750: "#ffefe6", 5800: "#fff1e7", 5850: "#fff0e9", 5900: "#fff3ea", 5950: "#fff2ec", 6000: "#fff4ed", 6050: "#fff3ef", 6100: "#fff5f0", 6150: "#fff4f2", 6200: "#fff6f3", 6250: "#fff5f5", 6300: "#fff7f5", 6350: "#fff6f8", 6400: "#fff8f8", 6450: "#fff8fb", 6500: "#fff9fb", 6550: "#fff9fd", 6600: "#fff9fd", 6650: "#fef9ff", 6700: "#fefaff", 6750: "#fcf7ff", 6800: "#fcf8ff", 6850: "#f9f6ff", 6900: "#faf7ff", 6950: "#f7f5ff", 7000: "#f7f5ff", 7050: "#f5f3ff", 7100: "#f5f4ff", 7150: "#f3f2ff", 7200: "#f3f3ff", 7250: "#f0f1ff", 7300: "#f1f1ff", 7350: "#eff0ff", 7400: "#eff0ff", 7450: "#edefff", 7500: "#eeefff", 7550: "#ebeeff", 7600: "#eceeff", 7650: "#e9edff", 7700: "#eaedff", 7750: "#e7ecff", 7800: "#e9ecff", 7850: "#e6ebff", 7900: "#e7eaff", 7950: "#e4eaff", 8000: "#e5e9ff", 8050: "#e3e9ff", 8100: "#e4e9ff", 8150: "#e1e8ff", 8200: "#e3e8ff", 8250: "#e0e7ff", 8300: "#e1e7ff", 8350: "#dee6ff", 8400: "#e0e6ff", 8450: "#dde6ff", 8500: "#dfe5ff", 8550: "#dce5ff", 8600: "#dde4ff", 8650: "#dae4ff", 8700: "#dce3ff", 8750: "#d9e3ff", 8800: "#dbe2ff", 8850: "#d8e3ff", 8900: "#dae2ff", 8950: "#d7e2ff", 9000: "#d9e1ff", 9050: "#d6e1ff", 9100: "#d8e0ff", 9150: "#d4e1ff", 9200: "#d7dfff", 9250: "#d3e0ff", 9300: "#d6dfff", 9350: "#d2dfff", 9400: "#d5deff", 9450: "#d1dfff", 9500: "#d4ddff", 9550: "#d0deff", 9600: "#d3ddff", 9650: "#cfddff", 9700: "#d2dcff", 9750: "#cfddff", 9800: "#d1dcff", 9850: "#cedcff", 9900: "#d0dbff", 9950: "#cddcff", 10000: "#cfdaff", 10050: "#ccdbff", 10100: "#cfdaff", 10150: "#cbdbff", 10200: "#ced9ff", 10250: "#cadaff", 10300: "#cdd9ff", 10350: "#c9daff", 10400: "#ccd8ff", 10450: "#c9d9ff", 10500: "#ccd8ff", 10550: "#c8d9ff", 10600: "#cbd7ff", 10650: "#c7d8ff", 10700: "#cad7ff", 10750: "#c7d8ff", 10800: "#cad6ff", 10850: "#c6d8ff", 10900: "#c9d6ff", 10950: "#c5d7ff", 11000: "#c8d5ff", 11050: "#c4d7ff", 11100: "#c8d5ff", 11150: "#c4d6ff", 11200: "#c7d4ff", 11250: "#c3d6ff", 11300: "#c6d4ff", 11350: "#c3d6ff", 11400: "#c6d4ff", 11450: "#c2d5ff", 11500: "#c5d3ff", 11550: "#c1d5ff", 11600: "#c5d3ff", 11650: "#c1d4ff", 11700: "#c4d2ff", 11750: "#c0d4ff", 11800: "#c4d2ff", 11850: "#c0d4ff", 11900: "#c3d2ff", 11950: "#bfd3ff", 12000: "#c3d1ff", 12050: "#bfd3ff", 12100: "#c2d1ff", 12150: "#bed3ff", 12200: "#c2d0ff", 12250: "#bed2ff", 12300: "#c1d0ff", 12350: "#bdd2ff", 12400: "#c1d0ff", 12450: "#bdd2ff", 12500: "#c0cfff", 12550: "#bcd2ff", 12600: "#c0cfff", 12650: "#bcd1ff", 12700: "#bfcfff", 12750: "#bbd1ff", 12800: "#bfceff", 12850: "#bbd1ff", 12900: "#beceff", 12950: "#bad0ff", 13000: "#beceff", 13050: "#bad0ff", 13100: "#beceff", 13150: "#b9d0ff", 13200: "#bdcdff", 13250: "#b9d0ff", 13300: "#bdcdff", 13350: "#b9cfff", 13400: "#bccdff", 13450: "#b8cfff", 13500: "#bcccff", 13550: "#b8cfff", 13600: "#bcccff", 13650: "#b7cfff", 13700: "#bbccff", 13750: "#b7ceff", 13800: "#bbccff", 13850: "#b7ceff", 13900: "#bbcbff", 13950: "#b6ceff", 14000: "#bacbff", 14050: "#b6ceff", 14100: "#bacbff", 14100: "#b6cdff", 14250: "#bacbff", 14200: "#b5cdff", 14350: "#b9caff", 14300: "#b5cdff", 14450: "#b9caff", 14400: "#b5cdff", 14550: "#b9caff", 14500: "#b4cdff", 14650: "#b8caff", 14600: "#b4ccff", 14750: "#b8c9ff", 14700: "#b4ccff", 14850: "#b8c9ff", 14800: "#b3ccff", 14950: "#b8c9ff", 14900: "#b3ccff", 15050: "#b7c9ff", 15000: "#b3ccff", 15150: "#b7c9ff", 15100: "#b2cbff", 15250: "#b7c8ff", 15200: "#b2cbff", 15350: "#b6c8ff", 15300: "#b2cbff", 15450: "#b6c8ff", 15400: "#b2cbff", 15550: "#b6c8ff", 15500: "#b1cbff", 15650: "#b6c8ff", 15600: "#b1caff", 15750: "#b5c7ff", 15700: "#b1caff", 15850: "#b5c7ff", 15800: "#b1caff", 15950: "#b5c7ff", 15900: "#b0caff", 16050: "#b5c7ff", 16000: "#b0caff", 16150: "#b4c7ff", 16100: "#b0caff", 16250: "#b4c6ff", 16200: "#afc9ff", 16350: "#b4c6ff", 16300: "#afc9ff", 16450: "#b4c6ff", 16400: "#afc9ff", 16550: "#b3c6ff", 16500: "#afc9ff", 16650: "#b3c6ff", 16600: "#afc9ff", 16750: "#b3c6ff", 16700: "#aec9ff", 16850: "#b3c5ff", 16800: "#aec9ff", 16950: "#b3c5ff", 16900: "#aec8ff", 17050: "#b2c5ff", 17000: "#aec8ff", 17150: "#b2c5ff", 17100: "#adc8ff", 17250: "#b2c5ff", 17200: "#adc8ff", 17350: "#b2c5ff", 17300: "#adc8ff", 17450: "#b2c4ff", 17400: "#adc8ff", 17550: "#b1c4ff", 17500: "#adc8ff", 17650: "#b1c4ff", 17600: "#acc7ff", 17750: "#b1c4ff", 17700: "#acc7ff", 17850: "#b1c4ff", 17800: "#acc7ff", 17950: "#b1c4ff", 17900: "#acc7ff", 18050: "#b0c4ff", 18000: "#acc7ff", 18150: "#b0c3ff", 18100: "#abc7ff", 18250: "#b0c3ff", 18200: "#abc7ff", 18350: "#b0c3ff", 18300: "#abc7ff", 18400: "#b0c3ff", 18450: "#abc6ff", 18500: "#b0c3ff", 18550: "#abc6ff", 18600: "#afc3ff", 18650: "#aac6ff", 18700: "#afc3ff", 18750: "#aac6ff", 18800: "#afc2ff", 18850: "#aac6ff", 18900: "#afc2ff", 18950: "#aac6ff", 19000: "#afc2ff", 19050: "#aac6ff", 19100: "#afc2ff", 19150: "#aac6ff", 19200: "#aec2ff", 19250: "#a9c6ff", 19300: "#aec2ff", 19350: "#a9c5ff", 19400: "#aec2ff", 19450: "#a9c5ff", 19500: "#aec2ff", 19550: "#a9c5ff", 19600: "#aec2ff", 19650: "#a9c5ff", 19700: "#aec1ff", 19750: "#a9c5ff", 19800: "#aec1ff", 19850: "#a9c5ff", 19900: "#adc1ff", 19950: "#a8c5ff", 20000: "#adc1ff", 20050: "#a8c5ff", 20100: "#adc1ff", 20150: "#a8c5ff", 20200: "#adc1ff", 20250: "#a8c5ff", 20300: "#adc1ff", 20350: "#a8c4ff", 20400: "#adc1ff", 20450: "#a8c4ff", 20500: "#adc1ff", 20550: "#a8c4ff", 20600: "#adc0ff", 20650: "#a7c4ff", 20700: "#acc0ff", 20750: "#a7c4ff", 20800: "#acc0ff", 20850: "#a7c4ff", 20900: "#acc0ff", 20950: "#a7c4ff", 21000: "#acc0ff", 21050: "#a7c4ff", 21100: "#acc0ff", 21150: "#a7c4ff", 21200: "#acc0ff", 21250: "#a7c4ff", 21300: "#acc0ff", 21350: "#a6c4ff", 21400: "#acc0ff", 21450: "#a6c3ff", 21500: "#abc0ff", 21550: "#a6c3ff", 21600: "#abc0ff", 21650: "#a6c3ff", 21700: "#abbfff", 21750: "#a6c3ff", 21800: "#abbfff", 21850: "#a6c3ff", 21900: "#abbfff", 21950: "#a6c3ff", 22000: "#abbfff", 22050: "#a6c3ff", 22100: "#abbfff", 22150: "#a5c3ff", 22200: "#abbfff", 22250: "#a5c3ff", 22300: "#abbfff", 22350: "#a5c3ff", 22400: "#aabfff", 22450: "#a5c3ff", 22500: "#aabfff", 22550: "#a5c3ff", 22600: "#aabfff", 22650: "#a5c3ff", 22700: "#aabfff", 22750: "#a5c2ff", 22800: "#aabeff", 22850: "#a5c2ff", 22900: "#aabeff", 22950: "#a5c2ff", 23000: "#aabeff", 23500: "#a4c2ff", 23100: "#aabeff", 23150: "#a4c2ff", 23200: "#aabeff", 23250: "#a4c2ff", 23300: "#aabeff", 23350: "#a4c2ff", 23400: "#a9beff", 23450: "#a4c2ff", 23500: "#a9beff", 23550: "#a4c2ff", 23600: "#a9beff", 23650: "#a4c2ff", 23700: "#a9beff", 23750: "#a4c2ff", 23800: "#a9beff", 23850: "#a4c2ff", 23900: "#a9beff", 23950: "#a4c2ff", 24000: "#a9beff", 24050: "#a3c2ff", 24100: "#a9beff", 24150: "#a3c2ff", 24200: "#a9bdff", 24250: "#a3c1ff", 24300: "#a9bdff", 24350: "#a3c1ff", 24400: "#a9bdff", 24450: "#a3c1ff", 24500: "#a8bdff", 24550: "#a3c1ff", 24600: "#a8bdff", 24650: "#a3c1ff", 24700: "#a8bdff", 24750: "#a3c1ff", 24800: "#a8bdff", 24850: "#a3c1ff", 24900: "#a8bdff", 24950: "#a3c1ff", 25000: "#a8bdff", 25050: "#a3c1ff", 25100: "#a8bdff", 25150: "#a2c1ff", 25200: "#a8bdff", 25250: "#a2c1ff", 25300: "#a8bdff", 25350: "#a2c1ff", 25400: "#a8bdff", 25450: "#a2c1ff", 25500: "#a8bdff", 25550: "#a2c1ff", 25600: "#a8bdff", 25650: "#a2c1ff", 25700: "#a7bcff", 25750: "#a2c1ff", 25800: "#a7bcff", 25850: "#a2c1ff", 25900: "#a7bcff", 25950: "#a2c0ff", 26000: "#a7bcff", 26050: "#a2c0ff", 26100: "#a7bcff", 26150: "#a2c0ff", 26200: "#a7bcff", 26250: "#a2c0ff", 26300: "#a7bcff", 26350: "#a2c0ff", 26400: "#a7bcff", 26450: "#a1c0ff", 26500: "#a7bcff", 26550: "#a1c0ff", 26600: "#a7bcff", 26650: "#a1c0ff", 26700: "#a7bcff", 26750: "#a1c0ff", 26800: "#a7bcff", 26850: "#a1c0ff", 26900: "#a7bcff", 26950: "#a1c0ff", 27000: "#a7bcff", 27050: "#a1c0ff", 27100: "#a6bcff", 27150: "#a1c0ff", 27200: "#a6bcff", 27250: "#a1c0ff", 27300: "#a6bcff", 27350: "#a1c0ff", 27400: "#a6bbff", 27450: "#a1c0ff", 27500: "#a6bbff", 27550: "#a1c0ff", 27600: "#a6bbff", 27650: "#a1c0ff", 27700: "#a6bbff", 27750: "#a1c0ff", 27800: "#a6bbff", 27850: "#a0c0ff", 27900: "#a6bbff", 27950: "#a0c0ff", 28000: "#a6bbff", 28050: "#a0bfff", 28100: "#a6bbff", 28150: "#a0bfff", 28200: "#a6bbff", 28250: "#a0bfff", 28300: "#a6bbff", 28350: "#a0bfff", 28400: "#a6bbff", 28400: "#a0bfff", 28550: "#a6bbff", 28500: "#a0bfff", 28650: "#a6bbff", 28600: "#a0bfff", 28750: "#a5bbff", 28700: "#a0bfff", 28850: "#a5bbff", 28800: "#a0bfff", 28950: "#a5bbff", 28900: "#a0bfff", 29050: "#a5bbff", 29000: "#a0bfff", 29150: "#a5bbff", 29100: "#a0bfff", 29250: "#a5bbff", 29200: "#a0bfff", 29350: "#a5bbff", 29300: "#9fbfff", 29450: "#a5bbff", 29400: "#9fbfff", 29500: "#a5baff", 29550: "#9fbfff", 29600: "#a5baff", 29650: "#9fbfff", 29700: "#a5baff", 29750: "#9fbfff", 29800: "#a5baff", 29850: "#9fbfff", 29900: "#a5baff", 29950: "#9fbfff", 30000: "#a5baff", 30050: "#9fbfff", 30100: "#a5baff", 30150: "#9fbfff", 30200: "#a5baff", 30250: "#9fbfff", 30300: "#a5baff", 30350: "#9fbfff", 30400: "#a5baff", 30450: "#9fbeff", 30500: "#a5baff", 30550: "#9fbeff", 30600: "#a4baff", 30650: "#9fbeff", 30700: "#a4baff", 30750: "#9fbeff", 30800: "#a4baff", 30850: "#9fbeff", 30900: "#a4baff", 30950: "#9fbeff", 31000: "#a4baff", 31050: "#9fbeff", 31100: "#a4baff", 31150: "#9ebeff", 31200: "#a4baff", 31250: "#9ebeff", 31300: "#a4baff", 31350: "#9ebeff", 31400: "#a4baff", 31450: "#9ebeff", 31500: "#a4baff", 31550: "#9ebeff", 31600: "#a4baff", 31650: "#9ebeff", 31700: "#a4baff", 31750: "#9ebeff", 31800: "#a4baff", 31850: "#9ebeff", 31900: "#a4baff", 31950: "#9ebeff", 32000: "#a4b9ff", 32050: "#9ebeff", 32100: "#a4b9ff", 32150: "#9ebeff", 32200: "#a4b9ff", 32250: "#9ebeff", 32300: "#a4b9ff", 32350: "#9ebeff", 32400: "#a4b9ff", 32450: "#9ebeff", 32500: "#a4b9ff", 32550: "#9ebeff", 32600: "#a4b9ff", 32650: "#9ebeff", 32700: "#a3b9ff", 32750: "#9ebeff", 32800: "#a3b9ff", 32850: "#9ebeff", 32900: "#a3b9ff", 32950: "#9ebeff", 33000: "#a3b9ff", 33050: "#9ebeff", 33100: "#a3b9ff", 33150: "#9ebeff", 33200: "#a3b9ff", 33250: "#9dbeff", 33300: "#a3b9ff", 33350: "#9dbeff", 33400: "#a3b9ff", 33450: "#9dbdff", 33500: "#a3b9ff", 33550: "#9dbdff", 33600: "#a3b9ff", 33650: "#9dbdff", 33700: "#a3b9ff", 33750: "#9dbdff", 33800: "#a3b9ff", 33850: "#9dbdff", 33900: "#a3b9ff", 33950: "#9dbdff", 34000: "#a3b9ff", 34050: "#9dbdff", 34100: "#a3b9ff", 34150: "#9dbdff", 34200: "#a3b9ff", 34250: "#9dbdff", 34300: "#a3b9ff", 34350: "#9dbdff", 34400: "#a3b9ff", 34450: "#9dbdff", 34500: "#a3b9ff", 34550: "#9dbdff", 34600: "#a3b9ff", 34650: "#9dbdff", 34700: "#a3b9ff", 34750: "#9dbdff", 34800: "#a3b9ff", 34850: "#9dbdff", 34900: "#a3b9ff", 34950: "#9dbdff", 35000: "#a3b8ff", 35050: "#9dbdff", 35150: "#a3b8ff", 35100: "#9dbdff", 35250: "#a2b8ff", 35200: "#9dbdff", 35350: "#a2b8ff", 35300: "#9dbdff", 35450: "#a2b8ff", 35400: "#9dbdff", 35550: "#a2b8ff", 35500: "#9dbdff", 35650: "#a2b8ff", 35600: "#9cbdff", 35750: "#a2b8ff", 35700: "#9cbdff", 35850: "#a2b8ff", 35800: "#9cbdff", 35950: "#a2b8ff", 35900: "#9cbdff", 36050: "#a2b8ff", 36000: "#9cbdff", 36150: "#a2b8ff", 36100: "#9cbdff", 36250: "#a2b8ff", 36200: "#9cbdff", 36350: "#a2b8ff", 36300: "#9cbdff", 36450: "#a2b8ff", 36400: "#9cbdff", 36550: "#a2b8ff", 36500: "#9cbdff", 36650: "#a2b8ff", 36600: "#9cbdff", 36750: "#a2b8ff", 36700: "#9cbdff", 36850: "#a2b8ff", 36800: "#9cbdff", 36950: "#a2b8ff", 36900: "#9cbdff", 37050: "#a2b8ff", 37000: "#9cbdff", 37150: "#a2b8ff", 37100: "#9cbdff", 37200: "#a2b8ff", 37250: "#9cbcff", 37300: "#a2b8ff", 37350: "#9cbcff", 37400: "#a2b8ff", 37450: "#9cbcff", 37500: "#a2b8ff", 37550: "#9cbcff", 37600: "#a2b8ff", 37650: "#9cbcff", 37700: "#a2b8ff", 37750: "#9cbcff", 37800: "#a2b8ff", 37850: "#9cbcff", 37900: "#a2b8ff", 37950: "#9cbcff", 38000: "#a2b8ff", 38050: "#9cbcff", 38100: "#a2b8ff", 38150: "#9cbcff", 38200: "#a2b8ff", 38250: "#9cbcff", 38300: "#a1b8ff", 38350: "#9cbcff", 38400: "#a1b8ff", 38450: "#9bbcff", 38500: "#a1b8ff", 38550: "#9bbcff", 38600: "#a1b7ff", 38650: "#9bbcff", 38700: "#a1b7ff", 38750: "#9bbcff", 38000: "#a1b7ff", 38800: "#9bbcff", 38950: "#a1b7ff", 38900: "#9bbcff", 39050: "#a1b7ff", 39000: "#9bbcff", 39150: "#a1b7ff", 39100: "#9bbcff", 39250: "#a1b7ff", 39200: "#9bbcff", 39350: "#a1b7ff", 39300: "#9bbcff", 39450: "#a1b7ff", 39400: "#9bbcff", 39550: "#a1b7ff", 39500: "#9bbcff", 39650: "#a1b7ff", 39600: "#9bbcff", 39750: "#a1b7ff", 39700: "#9bbcff", 39850: "#a1b7ff", 39800: "#9bbcff", 39950: "#a1b7ff", 39900: "#9bbcff", 40050: "#a1b7ff", 40000: "#9bbcff" }


	// Detects when the value of the temperature changes and executes the functions inside
    sensorValue.on("change", function() {	
    	var temperature = calcTemperature(this.raw);	// process sensor value
    	var celsius = KtoC(temperature);				// transforms Kelvins to Celsius
    	console.log("Celsius:" + celsius);				// logs the data into the console

	
    	// Transform celsius to a range from 1000 to 40000 (as the previous values of our range of colors value)
    	// We consider a range of -27.4 to 38.6 as the record of lowest and highest temperatures in NL: https://en.wikipedia.org/wiki/Netherlands#Climate
    	// We invert the value because in black bodies the lowest temperature is red and higher blue, which is counter intuitive. (See previous link). 
    	var colorValue = scale(celsius, 38.7, -27.4, 1000, 40000);


    	// Function to find the closest value of transformed temperature to the Colors array values we created before.
    	// Return the closest color value
		dist = Number.POSITIVE_INFINITY; 
		closestkey = -1; 
		for(i in colors) {
		    newdist = Math.abs(colorValue - i); 
		    if (newdist < dist) {
		        // we found a key closer to the value
		        dist = newdist; // set new smallest distance
		        closestkey = i; // set the value to the current key
		    }
		}

    	// Send values to the web. It changes the logo color (to visually see it) and the jar color.
    	io.emit('temperature', colors[closestkey]);
	});
  
});
