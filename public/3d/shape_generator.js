// title: Jar barrel
// author: Eduard Bespalov
// license: MIT License
// description: testing solidFromSlices()

// Here we define the user editable parameters:
function getParameterDefinitions() {
  return [
    { name: 'diameter', caption: 'Jar diameter:', type: 'float', default: 20 },
    { name: 'height', caption: 'Jar height:', type: 'float', default: 40 },
    { name: 'wallThick', caption: 'Jar wall thick:', type: 'float', default: 1 },
    // { name: 'colour', caption: 'Colour:', type: 'text', default: '#FF0000' },
  ];
}

function main(params)
{
  var radius = params.diameter / 2;
  var thick = params.wallThick;
  var height = params.height;
  var bottomThick = 2 * thick;

  var jar = hexTwisted(radius, height).subtract(
    hexTwisted( radius - thick, height - bottomThick)
    	 //rotate because jar is already rotated on that level
    	 //otherwise will get holes
    	.rotateZ(30 /** (bottomThick / height)*/)
    	.translate([0,0,bottomThick]) //make jar bottom
  );

  return jar;
}

function hexTwisted(radius, height) {
  // generate hexagonal shape;
  var sqrt3 = Math.sqrt(3) / 2;
  var cag = CAG.fromPoints([
      [radius, 0, 0],
      [radius / 2, radius * sqrt3, 0],
      [-radius / 2, radius * sqrt3, 0],
      [-radius, 0, 0],
      [-radius / 2, -radius * sqrt3, 0],
      [radius / 2, -radius * sqrt3, 0]
   ]).expand(5, CSG.defaultResolution2D);

	var flatBottom = CSG.Polygon.createFromPoints(
		cag.getOutlinePaths()[0].points
	);

  

  var hex = flatBottom.solidFromSlices({
  	numslices: height*4,callback: function(t) {
      
      var randomTwist = Math.floor(Math.random() * 70) + 50; // Generate a random number between 50 and 70.
      var randomScale = Math.random() * (1.2 - 0.6) + 0.6;
  		
      var coef = (t > 0.5 ? 1 - t : t) + 0.8;
  		var polygon = this
        .rotateZ(t * 60)       // rotate with a random twist
        .translate([0, 0, height * t])  // translate the polygon vertically as the height increases according to the number of slices.
        .scale([coef, coef, 1])         // 
        // .setColor(css2rgb(params.colour));
  		return polygon;
      }
  });

  return hex;
}
