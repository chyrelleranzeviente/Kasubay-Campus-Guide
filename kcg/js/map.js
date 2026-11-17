
// =================================
// KASUBAY - LEAFLET MAP SYSTEM
// =================================

let campusMap;

const locationCard = document.getElementById("locationCard");

const locationName = document.getElementById("locationName");

const locationDescription = document.getElementById("locationDescription");


// =================================
// INITIALIZE MAP
// =================================

function initializeMap() {

    const mapImage = new Image();

    mapImage.src = "assets/pics/uamap.jpg.jpg";

    mapImage.onload = function() {

        const imageWidth = mapImage.naturalWidth;
        const imageHeight = mapImage.naturalHeight;

        // DEFINE IMAGE BOUNDARIES

        const bounds = [
            [0, 0],
            [imageHeight, imageWidth]
        ];


        // CREATE INTERACTIVE MAP

        campusMap = L.map("campusMap", {

            crs: L.CRS.Simple,

            minZoom: -2,
            maxZoom: 2,

            zoomSnap: 0.1,
            zoomDelta: 0.25,

            zoomControl: false,

            attributionControl: true,

            maxBounds: bounds,
            maxBoundsViscosity: 0.8

        });


        // ADD SATELLITE IMAGE

        L.imageOverlay(
            "assets/pics/uamap.jpg.jpg",
            bounds
        ).addTo(campusMap);


        // =================================
        // SOFT WHITE MAP OVERLAY
        // =================================

        campusMap.createPane("softenPane");

        campusMap.getPane("softenPane").style.zIndex = 450;

        campusMap.getPane("softenPane").style.pointerEvents = "none";

        L.rectangle(bounds, {

            pane: "softenPane",

            stroke: false,

            fillColor: "#ffffff",

            fillOpacity: 0.28,

            interactive: false

        }).addTo(campusMap);


      
        // ADD ZOOM CONTROLS
       

        L.control.zoom({

            position: "bottomright"

        }).addTo(campusMap);


        // DISPLAY ENTIRE CAMPUS INITIALLY

        campusMap.fitBounds(bounds);


        // ADD BUILDING MARKERS

        renderMarkers(imageWidth, imageHeight);


        console.log("KasUbAy interactive map loaded!");

    };


    // IMAGE LOADING ERROR

    mapImage.onerror = function() {

        console.error("Unable to load uamap.jpg");

    };

}



// RENDER LOCATION MARKERSSS


function renderMarkers(imageWidth, imageHeight) {

    campusLocations.forEach(function(location) {

        // CONVERT PERCENTAGE COORDINATES

        const x = imageWidth * (location.x / 100);

        const y = imageHeight * (1 - location.y / 100);


        const markerIcon = L.divIcon({

            className: "",

            html: '<div class="map-marker"></div>',

            iconSize: [25, 25],

            iconAnchor: [12, 25]

        });


        const marker = L.marker([y, x], {

            icon: markerIcon

        }).addTo(campusMap);


        marker.bindTooltip(location.name);


        marker.on("click", function() {

            showLocation(location);

        });

    });

}


// =================================
// DISPLAY LOCATION INFORMATION
// =================================

function showLocation(location) {

    locationName.textContent = location.name;

    locationDescription.textContent = location.description;

    locationCard.classList.remove("hidden");

}


// =================================
// CLOSE LOCATION CARD
// =================================

function closeLocation() {

    locationCard.classList.add("hidden");

}


// CLOSE BUTTON

document.getElementById("closeCard").addEventListener("click", function() {

    closeLocation();

});


// =================================
// START MAP
// =================================

initializeMap();
