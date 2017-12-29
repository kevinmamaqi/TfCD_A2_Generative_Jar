(function() {

	socket = io.connect('http://localhost:3000');

    socket.on('connect', function(data) {
        socket.emit('join', 'Client is connected!');
    });

    socket.on('temperature', function(value){
      document.getElementById("Layer_2").style.fill = value;
    });


}());
