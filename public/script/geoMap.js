/* global document, google, navigator, firebase */
const mapCanvas = document.getElementById('map_canvas');
const geoBtn = document.querySelector('.enable');
const shuttleLoopRef = document.getElementById('shuttle-type');
geoBtn.onclick = function () {
  console.log('Permission currently denied; future features of the Permissions API will allow us to request permission here.');
  console.log('Currently you have to reset the permission state using the browser UI.');
  console.log('In Firefox it is done with Tools > Page Info > Permissions > Access Your Location.');
};

let uuid = uuidv4();
let latlng;
let paused = false;

const myOptions = {
  zoom: 16,
  center: latlng,
  mapTypeId: google.maps.MapTypeId.ROADMAP,
};
const map = new google.maps.Map(mapCanvas, myOptions);
const markerTitle = 'You are here';
let marker = new google.maps.Marker({
  position: latlng,
  map,
  title: markerTitle,
  label: markerTitle,
});

function report(state) {
  console.log(`Permission: ${state}`);
}

const positionDenied = function () {
  geoBtn.style.display = 'inline';
};

function setShuttleDisconnect() {
  firebase.database().ref(`/shuttles/${uuid}`).onDisconnect().remove();
}

const onLoopChange = (event) => {
  uuid = uuidv4(); // Generate new UUID for shuttle, causes old shuttle node to be reaped after timeout
  setShuttleDisconnect();
}

const revealPosition = (position) => {
  if (paused) return;

  console.log(position);
  geoBtn.style.display = 'none';

  if (latlng) {
    var prevCoordinates = [latlng.lat(), latlng.lng()];
  }
  latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  marker.setPosition(latlng);
  map.setCenter(latlng);

  const updates = {};
  const shuttleLoop = shuttleLoopRef.options[shuttleLoopRef.selectedIndex];
  updates[`/shuttles/${uuid}`] = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(position.coords.latitude), parseFloat(position.coords.longitude)],
    },
    properties: {
      loopKey: shuttleLoop.value,
      loopDisplayName: shuttleLoop.text,
      timestamp: position.timestamp,
      speed: position.coords.speed,
      altitude: position.coords.altitude,
      loop: shuttleLoop,
      prevCoordinates
    },
  };
  return firebase.database().ref().update(updates);
};

// test for geolocation support
if (!('geolocation' in navigator)) {
  alert('No geolocation available!');
}
// provide geolocation settings
const geoSettings = {
  enableHighAccuracy: false,
  maximumAge: 30000,
  timeout: 20000,
};

// Start everything off
// determine location of the user's device
function handlePermission() {
  navigator.geolocation.watchPosition(revealPosition, positionDenied, geoSettings);
  navigator.permissions.query({ name: 'geolocation' }).then((result) => {
    if (result.state === 'granted') {
      report(result.state);
      geoBtn.style.display = 'none';
      navigator.geolocation.watchPosition(revealPosition, positionDenied, geoSettings);
    } else if (result.state === 'prompt') {
      report(result.state);
      navigator.geolocation.watchPosition(revealPosition, positionDenied, geoSettings);
    } else if (result.state === 'denied') {
      report(result.state);
      geoBtn.style.display = 'inline';
    }
    result.onchange = () => {
      report(result.state);
    };
  });
}

function togglePause() {
  paused = !paused;
  const pauseRef = document.getElementById('pause');
  console.log(paused);
  pauseRef.classList.remove(paused ? 'fa-pause' : 'fa-play');
  pauseRef.classList.add(paused ? 'fa-play' : 'fa-pause');
}

window.onload = () => {
  document.getElementById('enable-geolocation').addEventListener('click', () => {
    alert("Here");
    setShuttleDisconnect();
    handlePermission();
  });
};
